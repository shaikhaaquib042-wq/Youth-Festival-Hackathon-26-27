import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import seedData from '../data/seed.json';
import { generateDonors } from '../scripts/generate-seed';

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

describe('Phase 1: Seed Data & Determinism', () => {
  it('contains exactly 300 donors, 8 hospitals, and 60 historical requests', () => {
    expect(seedData.donors.length).toBe(300);
    expect(seedData.hospitals.length).toBe(8);
    expect(seedData.historicalRequests.length).toBe(60);
    expect(seedData.campuses.length).toBeGreaterThanOrEqual(6);
  });

  it('verifies largest-remainder blood group distribution to exactly 300', () => {
    const counts = seedData.donors.reduce((acc: Record<string, number>, d) => {
      acc[d.bloodGroup] = (acc[d.bloodGroup] || 0) + 1;
      return acc;
    }, {});

    expect(counts['O+']).toBe(108); // 36%
    expect(counts['B+']).toBe(96);  // 32%
    expect(counts['A+']).toBe(66);  // 22%
    expect(counts['AB+']).toBe(21); // 7%
    expect(counts['O-']).toBe(3);
    expect(counts['B-']).toBe(2);
    expect(counts['A-']).toBe(2);
    expect(counts['AB-']).toBe(2);
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(300);
  });

  it('guarantees deterministic output across generation runs', () => {
    const run1 = generateDonors(422026);
    const run2 = generateDonors(422026);
    const hash1 = crypto.createHash('sha256').update(JSON.stringify(run1.donors)).digest('hex');
    const hash2 = crypto.createHash('sha256').update(JSON.stringify(run2.donors)).digest('hex');
    expect(hash1).toBe(hash2);
  });

  it('satisfies the Demo Guarantee near Ruby Hall Clinic (>=5 Tier-1 <5km, >=10 Tier-2 5-10km for B+)', () => {
    const rubyHall = seedData.hospitals.find((h) => h.name.includes('Ruby Hall'));
    expect(rubyHall).toBeDefined();
    if (!rubyHall) return;

    // Compatible with B+ are B+, B-, O+, O-
    const compatibleGroups = new Set(['B+', 'B-', 'O+', 'O-']);
    const anchorMidnight = Date.parse(seedData.anchorDate.split('T')[0] + 'T00:00:00.000Z');

    const eligibleCompatible = seedData.donors.filter((d) => {
      if (!compatibleGroups.has(d.bloodGroup)) return false;
      if (!d.isOptedIn) return false;
      if (d.availabilityStatus !== 'available') return false;

      const donorMidnight = Date.parse(d.lastDonationDate + 'T00:00:00.000Z');
      const daysSince = Math.floor((anchorMidnight - donorMidnight) / (24 * 60 * 60 * 1000));
      const reqInterval = d.sex === 'male' ? 90 : 120;
      return daysSince >= reqInterval;
    });

    const tier1Candidates = eligibleCompatible.filter((d) => {
      const dist = calculateHaversineKm(rubyHall.latitude, rubyHall.longitude, d.latitude, d.longitude);
      return dist <= 5.0;
    });

    const tier2Candidates = eligibleCompatible.filter((d) => {
      const dist = calculateHaversineKm(rubyHall.latitude, rubyHall.longitude, d.latitude, d.longitude);
      return dist > 5.0 && dist <= 10.0;
    });

    expect(tier1Candidates.length).toBeGreaterThanOrEqual(5);
    expect(tier2Candidates.length).toBeGreaterThanOrEqual(10);
  });

  it('includes interval boundary donors for both sexes (N-1, N, N+1)', () => {
    const anchorMidnight = Date.parse(seedData.anchorDate.split('T')[0] + 'T00:00:00.000Z');
    const donorDays = seedData.donors.slice(0, 6).map((d) => {
      const donorMidnight = Date.parse(d.lastDonationDate + 'T00:00:00.000Z');
      const days = Math.round((anchorMidnight - donorMidnight) / (24 * 3600 * 1000));
      return { sex: d.sex, days };
    });

    expect(donorDays).toContainEqual({ sex: 'male', days: 89 });
    expect(donorDays).toContainEqual({ sex: 'male', days: 90 });
    expect(donorDays).toContainEqual({ sex: 'male', days: 91 });
    expect(donorDays).toContainEqual({ sex: 'female', days: 119 });
    expect(donorDays).toContainEqual({ sex: 'female', days: 120 });
    expect(donorDays).toContainEqual({ sex: 'female', days: 121 });
  });

  it('keeps secret phone numbers segregated from public donor schema', () => {
    seedData.donors.forEach((d) => {
      expect(d.maskedPhone).toMatch(/^\+91 XXXXX XX\d{2}$/);
      expect((d as Record<string, unknown>).revealPhone).toBeUndefined();
    });
    expect(Object.keys(seedData.secretPhones).length).toBe(300);
  });
});
