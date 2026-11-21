import { describe, it, expect } from 'vitest';
import {
  RBC_RECIPIENT_COMPATIBILITY,
  isBloodCompatible,
  deriveDonorToRecipientsMap,
} from '../lib/matching/compatibility';
import { calculateHaversineKm } from '../lib/matching/haversine';
import { checkDonorEligibility } from '../lib/matching/eligibility';
import { calculateMatchScore, rankDonors } from '../lib/matching/scoring';
import {
  selectEscalationDonors,
  isRareBloodGroup,
  calculateImpactMetrics,
} from '../lib/matching/escalation';
import {
  canRevealContact,
  isRequestExpired,
  isPiiPurgeDue,
  reduceDomainEvent,
} from '../lib/matching/lifecycle';
import { Donor, BloodRequest, Hospital, BloodBank, DomainEvent, AppDataStore } from '../types';

describe('Phase 2: Intelligent Matching Engine & Lifecycle Tests', () => {
  it('1. correctly defines RBC compatibility for all blood groups', () => {
    expect(RBC_RECIPIENT_COMPATIBILITY['O-']).toEqual(['O-']);
    expect(RBC_RECIPIENT_COMPATIBILITY['O+']).toEqual(['O-', 'O+']);
    expect(RBC_RECIPIENT_COMPATIBILITY['A-']).toEqual(['O-', 'A-']);
    expect(RBC_RECIPIENT_COMPATIBILITY['A+']).toEqual(['O-', 'O+', 'A-', 'A+']);
    expect(RBC_RECIPIENT_COMPATIBILITY['B-']).toEqual(['O-', 'B-']);
    expect(RBC_RECIPIENT_COMPATIBILITY['B+']).toEqual(['O-', 'O+', 'B-', 'B+']);
    expect(RBC_RECIPIENT_COMPATIBILITY['AB-']).toEqual(['O-', 'A-', 'B-', 'AB-']);
    expect(RBC_RECIPIENT_COMPATIBILITY['AB+']).toEqual([
      'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+',
    ]);
  });

  it('2. verifies that inverting recipient compatibility matches donor compatibility consistently', () => {
    const derived = deriveDonorToRecipientsMap();
    expect(derived['O-']).toHaveLength(8);
    expect(derived['AB+']).toEqual(['AB+']);

    const groups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const;
    for (const donor of groups) {
      for (const recipient of groups) {
        const canGive = isBloodCompatible(donor, recipient);
        const inDonorMap = derived[donor].includes(recipient);
        expect(canGive).toBe(inDonorMap);
      }
    }
  });

  it('3. verifies donor eligibility logic (opted-in, available, interval, compatibility)', () => {
    const anchorTime = '2026-11-21T12:00:00.000Z';
    const baseDonor: Donor = {
      id: 'test-d1',
      firstName: 'Rohan',
      bloodGroup: 'B+',
      sex: 'male',
      lastDonationDate: '2026-08-01',
      area: 'Kothrud',
      latitude: 18.5074,
      longitude: 73.8077,
      reliabilityScore: 0.9,
      responseRate: 0.85,
      isOptedIn: true,
      college: 'COEP',
      maskedPhone: '+91 XXXXX XX123',
      availabilityStatus: 'available',
    };

    const res1 = checkDonorEligibility(baseDonor, 'B+', anchorTime);
    expect(res1.isEligible).toBe(true);

    const res2 = checkDonorEligibility(baseDonor, 'A+', anchorTime);
    expect(res2.isEligible).toBe(false);
    expect(res2.reason).toContain('not red-cell compatible');

    const res3 = checkDonorEligibility({ ...baseDonor, isOptedIn: false }, 'B+', anchorTime);
    expect(res3.isEligible).toBe(false);
    expect(res3.reason).toContain('opted out');

    const res4 = checkDonorEligibility({ ...baseDonor, availabilityStatus: 'busy' }, 'B+', anchorTime);
    expect(res4.isEligible).toBe(false);
    expect(res4.reason).toContain('busy');
  });

  it('4. strictly tests cooling-off interval boundaries (N-1 ineligible, N eligible, N+1 eligible)', () => {
    const anchorTime = '2026-11-21T12:00:00.000Z';
    const anchorMs = Date.parse('2026-11-21T00:00:00.000Z');

    const maleDonor = (daysAgo: number): Donor => ({
      id: `male-${daysAgo}`,
      firstName: 'Rahul',
      bloodGroup: 'O+',
      sex: 'male',
      lastDonationDate: new Date(anchorMs - daysAgo * 86400000).toISOString().split('T')[0],
      area: 'Shivajinagar',
      latitude: 18.53,
      longitude: 73.84,
      reliabilityScore: 0.8,
      responseRate: 0.8,
      isOptedIn: true,
      college: null,
      maskedPhone: '+91 XXXXX XX111',
      availabilityStatus: 'available',
    });

    expect(checkDonorEligibility(maleDonor(89), 'O+', anchorTime).isEligible).toBe(false);
    expect(checkDonorEligibility(maleDonor(90), 'O+', anchorTime).isEligible).toBe(true);
    expect(checkDonorEligibility(maleDonor(91), 'O+', anchorTime).isEligible).toBe(true);

    const femaleDonor = (daysAgo: number): Donor => ({
      id: `female-${daysAgo}`,
      firstName: 'Sneha',
      bloodGroup: 'O+',
      sex: 'female',
      lastDonationDate: new Date(anchorMs - daysAgo * 86400000).toISOString().split('T')[0],
      area: 'Shivajinagar',
      latitude: 18.53,
      longitude: 73.84,
      reliabilityScore: 0.8,
      responseRate: 0.8,
      isOptedIn: true,
      college: null,
      maskedPhone: '+91 XXXXX XX222',
      availabilityStatus: 'available',
    });

    expect(checkDonorEligibility(femaleDonor(119), 'O+', anchorTime).isEligible).toBe(false);
    expect(checkDonorEligibility(femaleDonor(120), 'O+', anchorTime).isEligible).toBe(true);
    expect(checkDonorEligibility(femaleDonor(121), 'O+', anchorTime).isEligible).toBe(true);
  });

  it('5. computes accurate Haversine distance against known Pune coordinates', () => {
    const distRubyToSassoon = calculateHaversineKm(18.5326, 73.8776, 18.5264, 73.8715);
    expect(distRubyToSassoon).toBeGreaterThan(0.8);
    expect(distRubyToSassoon).toBeLessThan(1.2);

    const distRubyToHinjewadi = calculateHaversineKm(18.5326, 73.8776, 18.5913, 73.7389);
    expect(distRubyToHinjewadi).toBeGreaterThan(14.0);
    expect(distRubyToHinjewadi).toBeLessThan(18.0);
  });

  it('6. validates matching score formula and weights', () => {
    const donor: Donor = {
      id: 'd-test-score',
      firstName: 'Aniket',
      bloodGroup: 'B+',
      sex: 'male',
      lastDonationDate: '2026-06-01',
      area: 'Yerawada',
      latitude: 18.5326,
      longitude: 73.8776,
      reliabilityScore: 1.0,
      responseRate: 1.0,
      isOptedIn: true,
      college: null,
      maskedPhone: '+91 XXXXX XX444',
      availabilityStatus: 'available',
    };

    const scoreExact = calculateMatchScore(donor, 'B+', 18.5326, 73.8776);
    expect(scoreExact.proximity).toBe(1.0);
    expect(scoreExact.exactMatch).toBe(1.0);
    expect(scoreExact.compositeScore).toBe(1.0);

    const scoreCompatible = calculateMatchScore(donor, 'AB+', 18.5326, 73.8776);
    expect(scoreCompatible.exactMatch).toBe(0.0);
    expect(scoreCompatible.compositeScore).toBe(0.75);
  });

  it('7. prioritizes exact blood group matches and maintains deterministic tiebreaking', () => {
    const d1: Donor = {
      id: 'd-comp-1',
      firstName: 'O-Donor',
      bloodGroup: 'O+',
      sex: 'male',
      lastDonationDate: '2026-01-01',
      area: 'Camp',
      latitude: 18.5326,
      longitude: 73.8776,
      reliabilityScore: 0.95,
      responseRate: 0.95,
      isOptedIn: true,
      college: null,
      maskedPhone: '+91 XXXXX XX001',
      availabilityStatus: 'available',
    };

    const d2: Donor = {
      id: 'd-exact-1',
      firstName: 'B-Donor',
      bloodGroup: 'B+',
      sex: 'male',
      lastDonationDate: '2026-01-01',
      area: 'Camp',
      latitude: 18.5326,
      longitude: 73.8776,
      reliabilityScore: 0.95,
      responseRate: 0.95,
      isOptedIn: true,
      college: null,
      maskedPhone: '+91 XXXXX XX002',
      availabilityStatus: 'available',
    };

    const ranked = rankDonors([d1, d2], 'B+', 18.5326, 73.8776);
    expect(ranked[0].donor.id).toBe('d-exact-1');
  });

  const mockHospital: Hospital = {
    id: 'hosp-mock',
    name: 'Ruby Hall Clinic',
    area: 'Sassoon Road',
    latitude: 18.5326,
    longitude: 73.8776,
    contact: '+91 20 6645 5100',
    hasBloodBank: true,
  };

  const mockBloodBanks: BloodBank[] = [
    {
      id: 'bb-1',
      name: 'Poona Serological',
      area: 'Shivajinagar',
      latitude: 18.531,
      longitude: 73.844,
      contact: '020-25534567',
    },
  ];

  function makeMockDonors(count: number, distKm: number, bg: 'B+' | 'O+'): Donor[] {
    const list: Donor[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      const lat = mockHospital.latitude + (distKm / 111.0) * Math.sin(angle);
      const lng = mockHospital.longitude + (distKm / (111.0 * Math.cos((mockHospital.latitude * Math.PI) / 180))) * Math.cos(angle);
      list.push({
        id: `mock-${bg}-${distKm}km-${i + 1}`,
        firstName: `Donor${i}`,
        bloodGroup: bg,
        sex: 'male',
        lastDonationDate: '2026-01-01',
        area: 'Pune',
        latitude: lat,
        longitude: lng,
        reliabilityScore: 0.9,
        responseRate: 0.85,
        isOptedIn: true,
        college: null,
        maskedPhone: '+91 XXXXX XX999',
        availabilityStatus: 'available',
      });
    }
    return list;
  }

  it('8. selects top 5 eligible candidates within 5 km for Tier 1', () => {
    const donors = [
      ...makeMockDonors(8, 3.0, 'B+'),
      ...makeMockDonors(10, 7.0, 'B+'),
    ];

    const req: BloodRequest = {
      id: 'req-t1',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Joshi',
      verificationStatus: 'verified',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'P-101' },
    };

    const res = selectEscalationDonors(req, mockHospital, donors, mockBloodBanks, '2026-11-21T10:01:00.000Z');
    expect(res.tier).toBe(1);
    expect(res.selectedDonors.length).toBe(5);
    res.selectedDonors.forEach((s) => {
      expect(s.components.distanceKm).toBeLessThanOrEqual(5.0);
    });
  });

  it('9. escalates to Tier 2: expands to 10 km and selects next 10 unnotified donors', () => {
    const tier1Donors = makeMockDonors(5, 3.0, 'B+');
    const tier2Candidates = makeMockDonors(15, 7.0, 'B+');
    const donors = [...tier1Donors, ...tier2Candidates];

    const req: BloodRequest = {
      id: 'req-t2',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Joshi',
      verificationStatus: 'verified',
      tier: 1,
      acceptedDonorIds: [],
      notifiedDonorIds: tier1Donors.map((d) => d.id),
      fulfilledUnits: 0,
      requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'P-101' },
    };

    const res = selectEscalationDonors(req, mockHospital, donors, mockBloodBanks, '2026-11-21T10:11:00.000Z');
    expect(res.tier).toBe(2);
    expect(res.selectedDonors.length).toBe(10);
    res.selectedDonors.forEach((s) => {
      expect(req.notifiedDonorIds).not.toContain(s.donor.id);
      expect(s.components.distanceKm).toBeLessThanOrEqual(10.0);
    });
  });

  it('10. escalates to Tier 3: expands to 25 km and flags nearby blood banks', () => {
    const donors = [
      ...makeMockDonors(5, 3.0, 'B+'),
      ...makeMockDonors(10, 7.0, 'B+'),
      ...makeMockDonors(25, 18.0, 'B+'),
    ];

    const notifiedIds = donors.slice(0, 15).map((d) => d.id);

    const req: BloodRequest = {
      id: 'req-t3',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Joshi',
      verificationStatus: 'verified',
      tier: 2,
      acceptedDonorIds: [],
      notifiedDonorIds: notifiedIds,
      fulfilledUnits: 0,
      requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'P-101' },
    };

    const res = selectEscalationDonors(req, mockHospital, donors, mockBloodBanks, '2026-11-21T10:26:00.000Z');
    expect(res.tier).toBe(3);
    expect(res.selectedDonors.length).toBe(20);
    expect(res.flaggedBloodBanks.length).toBeGreaterThan(0);
    expect(res.flaggedBloodBanks[0].flagged).toBe(true);
  });

  it('11. skips standard tiers for rare blood groups and notifies all eligible within 30 km', () => {
    expect(isRareBloodGroup('AB-')).toBe(true);
    expect(isRareBloodGroup('O-')).toBe(true);
    expect(isRareBloodGroup('B+')).toBe(false);

    const rareDonors: Donor[] = [
      {
        id: 'rare-1',
        firstName: 'Anjali',
        bloodGroup: 'AB-',
        sex: 'female',
        lastDonationDate: '2026-01-01',
        area: 'Hadapsar',
        latitude: 18.5089,
        longitude: 73.9259,
        reliabilityScore: 0.95,
        responseRate: 0.9,
        isOptedIn: true,
        college: null,
        maskedPhone: '+91 XXXXX XX333',
        availabilityStatus: 'available',
      },
    ];

    const reqRare: BloodRequest = {
      id: 'req-rare',
      bloodGroup: 'AB-',
      units: 1,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Patil',
      verificationStatus: 'verified',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: { name: 'Amit', phone: '+91 98221 00000', hospitalPatientId: 'P-999' },
    };

    const res = selectEscalationDonors(reqRare, mockHospital, rareDonors, mockBloodBanks, '2026-11-21T10:01:00.000Z');
    expect(res.tier).toBe('rare');
    expect(res.isRareGroup).toBe(true);
    expect(res.selectedDonors.length).toBe(1);
    expect(res.flaggedBloodBanks.length).toBeGreaterThan(0);
  });

  it('12. enforces maximum notification cap per request (35 non-rare)', () => {
    const donors = makeMockDonors(50, 4.0, 'B+');
    const req: BloodRequest = {
      id: 'req-cap',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'urgent',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T18:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Rao',
      verificationStatus: 'verified',
      tier: 2,
      acceptedDonorIds: [],
      notifiedDonorIds: donors.slice(0, 30).map((d) => d.id),
      fulfilledUnits: 0,
      requester: { name: 'Vikas', phone: '+91 98222 33333', hospitalPatientId: 'P-500' },
    };

    const res = selectEscalationDonors(req, mockHospital, donors, mockBloodBanks, '2026-11-21T10:30:00.000Z');
    expect(res.selectedDonors.length).toBe(5);
    expect(res.reachedMaxCap).toBe(true);
  });

  it('13. guarantees zero duplicate notifications across multiple escalation tiers', () => {
    const allDonors = makeMockDonors(40, 4.0, 'B+');

    const req: BloodRequest = {
      id: 'req-multi-tier',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Kulkarni',
      verificationStatus: 'verified',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: { name: 'Kavita', phone: '+91 98223 44444', hospitalPatientId: 'P-700' },
    };

    const t1 = selectEscalationDonors(req, mockHospital, allDonors, mockBloodBanks, '2026-11-21T10:01:00.000Z');
    req.tier = 1;
    req.notifiedDonorIds.push(...t1.selectedDonors.map((s) => s.donor.id));

    const t2 = selectEscalationDonors(req, mockHospital, allDonors, mockBloodBanks, '2026-11-21T10:11:00.000Z');
    req.tier = 2;
    req.notifiedDonorIds.push(...t2.selectedDonors.map((s) => s.donor.id));

    const idSet = new Set(req.notifiedDonorIds);
    expect(idSet.size).toBe(req.notifiedDonorIds.length);
  });

  it('14. correctly identifies expired requests based on simulated clock', () => {
    const req: BloodRequest = {
      id: 'req-exp',
      bloodGroup: 'O+',
      units: 1,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Deshmukh',
      verificationStatus: 'verified',
      tier: 1,
      acceptedDonorIds: [],
      notifiedDonorIds: ['donor-1'],
      fulfilledUnits: 0,
      requester: { name: 'Sanjay', phone: '+91 98224 55555', hospitalPatientId: 'P-800' },
    };

    expect(isRequestExpired(req, '2026-11-21T13:59:00.000Z')).toBe(false);
    expect(isRequestExpired(req, '2026-11-21T14:00:00.000Z')).toBe(true);
    expect(isRequestExpired(req, '2026-11-21T15:00:00.000Z')).toBe(true);
  });

  it('15. terminates matching once required units are fulfilled', () => {
    const donors = makeMockDonors(10, 3.0, 'B+');
    const req: BloodRequest = {
      id: 'req-ful',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'fulfilled',
      verifiedBy: 'Dr. Shah',
      verificationStatus: 'verified',
      tier: 1,
      acceptedDonorIds: ['d1', 'd2'],
      notifiedDonorIds: ['d1', 'd2', 'd3'],
      fulfilledUnits: 2,
      requester: { name: 'Meena', phone: '+91 98225 66666', hospitalPatientId: 'P-900' },
    };

    const res = selectEscalationDonors(req, mockHospital, donors, mockBloodBanks, '2026-11-21T10:15:00.000Z');
    expect(res.selectedDonors.length).toBe(0);
  });

  it('16. strictly gates contact reveal: denied if unverified, unaccepted, or closed', () => {
    const validReq: BloodRequest = {
      id: 'req-auth',
      bloodGroup: 'B+',
      units: 1,
      hospitalId: mockHospital.id,
      urgency: 'urgent',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T18:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Patel',
      verificationStatus: 'verified',
      tier: 1,
      acceptedDonorIds: ['donor-accepted-1'],
      notifiedDonorIds: ['donor-accepted-1', 'donor-not-accepted-2'],
      fulfilledUnits: 0,
      requester: { name: 'Raj', phone: '+91 98226 77777', hospitalPatientId: 'P-111' },
    };

    const auth1 = canRevealContact(validReq, 'donor-accepted-1');
    expect(auth1.authorized).toBe(true);

    const auth2 = canRevealContact(validReq, 'donor-not-accepted-2');
    expect(auth2.authorized).toBe(false);
    expect(auth2.reason).toContain('not accepted');

    const unverifiedReq = { ...validReq, verificationStatus: 'pending' as const };
    const auth3 = canRevealContact(unverifiedReq, 'donor-accepted-1');
    expect(auth3.authorized).toBe(false);
    expect(auth3.reason).toContain('not verified');

    const cancelledReq = { ...validReq, status: 'cancelled' as const };
    const auth4 = canRevealContact(cancelledReq, 'donor-accepted-1');
    expect(auth4.authorized).toBe(false);
    expect(auth4.reason).toContain('cancelled');
  });

  it('throws security error if attempting to notify for an unverified request', () => {
    const unverifiedReq: BloodRequest = {
      id: 'req-unverified',
      bloodGroup: 'B+',
      units: 1,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'open',
      verifiedBy: null,
      verificationStatus: 'pending',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'P-101' },
    };

    expect(() =>
      selectEscalationDonors(unverifiedReq, mockHospital, [], mockBloodBanks, '2026-11-21T10:00:00.000Z')
    ).toThrow('Unverified requests cannot notify donors');
  });

  it('correctly calculates PII purge eligibility after 24 simulated hours', () => {
    const closedTime = '2026-11-21T10:00:00.000Z';
    expect(isPiiPurgeDue(closedTime, '2026-11-22T09:00:00.000Z')).toBe(false);
    expect(isPiiPurgeDue(closedTime, '2026-11-22T10:00:00.000Z')).toBe(true);
    expect(isPiiPurgeDue(closedTime, '2026-11-22T11:00:00.000Z')).toBe(true);
  });

  it('calculates WhatsApp forward reach vs RaktSetu notifications avoided', () => {
    const impact = calculateImpactMetrics(5);
    expect(impact.estimatedReach).toBe(510);
    expect(impact.actualNotifiedCount).toBe(5);
    expect(impact.notificationsAvoided).toBe(505);
  });

  it('preserves invariants under a sequence of domain events', () => {
    const initialStore: AppDataStore = {
      version: '1.0.0',
      seedHash: 'test-seed',
      donors: [],
      hospitals: [mockHospital],
      bloodBanks: mockBloodBanks,
      requests: [],
      notifications: [],
      donationEvents: [],
      auditLogs: [],
      historicalRequests: [],
      campuses: [],
      scheduledCamps: [],
    };

    const newReq: BloodRequest = {
      id: 'req-fold-1',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: mockHospital.id,
      urgency: 'critical',
      createdAt: '2026-11-21T10:00:00.000Z',
      expiresAt: '2026-11-21T14:00:00.000Z',
      status: 'open',
      verifiedBy: null,
      verificationStatus: 'pending',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: { name: 'Ketan', phone: '+91 99999 88888', hospitalPatientId: 'P-12' },
    };

    const events: DomainEvent[] = [
      { type: 'RequestCreated', payload: newReq, timestamp: '2026-11-21T10:00:00.000Z' },
      {
        type: 'VerificationSucceeded',
        payload: { requestId: 'req-fold-1', verifiedBy: 'Hospital Staff' },
        timestamp: '2026-11-21T10:02:00.000Z',
      },
      {
        type: 'TierNotified',
        payload: {
          requestId: 'req-fold-1',
          tier: 1,
          donorIds: ['d1', 'd2'],
          notifications: [
            { id: 'n1', requestId: 'req-fold-1', donorId: 'd1', tier: 1, sentAt: '2026-11-21T10:03:00.000Z', status: 'sent' },
            { id: 'n2', requestId: 'req-fold-1', donorId: 'd2', tier: 1, sentAt: '2026-11-21T10:03:00.000Z', status: 'sent' },
          ],
        },
        timestamp: '2026-11-21T10:03:00.000Z',
      },
      {
        type: 'DonorAccepted',
        payload: { requestId: 'req-fold-1', donorId: 'd1', notificationId: 'n1' },
        timestamp: '2026-11-21T10:06:00.000Z',
      },
      {
        type: 'UnitsFulfilled',
        payload: {
          requestId: 'req-fold-1',
          unitsFulfilled: 2,
          donationEvent: { id: 'de-1', requestId: 'req-fold-1', donorId: 'd1', units: 2, timestamp: '2026-11-21T10:10:00.000Z' },
        },
        timestamp: '2026-11-21T10:10:00.000Z',
      },
      {
        type: 'PiiPurged',
        payload: { requestId: 'req-fold-1' },
        timestamp: '2026-11-22T10:10:00.000Z',
      },
    ];

    let state = initialStore;
    for (const evt of events) {
      state = reduceDomainEvent(state, evt);
    }

    const foldedReq = state.requests.find((r: BloodRequest) => r.id === 'req-fold-1');
    expect(foldedReq).toBeDefined();
    expect(foldedReq?.verificationStatus).toBe('verified');
    expect(foldedReq?.status).toBe('fulfilled');
    expect(foldedReq?.fulfilledUnits).toBe(2);
    expect(foldedReq?.requester).toBeNull();
    expect(state.donationEvents.length).toBe(1);
    expect(state.notifications[0].status).toBe('accepted');
  });
});
