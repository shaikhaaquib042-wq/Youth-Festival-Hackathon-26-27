import {
  Donor,
  BloodRequest,
  MatchingTier,
  ScoredDonor,
  Hospital,
  BloodBank,
} from '../../types';
import { CONFIG } from '../config';
import { checkDonorEligibility } from './eligibility';
import { rankDonors } from './scoring';

export interface EscalationCandidateSelection {
  tier: MatchingTier;
  selectedDonors: ScoredDonor[];
  shortfall: number;
  flaggedBloodBanks: BloodBank[];
  totalEligibleCompatible: number;
  totalCompatible: number;
  isRareGroup: boolean;
  reachedMaxCap: boolean;
}

export function isRareBloodGroup(group: string): boolean {
  return (CONFIG.RARE_GROUPS as readonly string[]).includes(group);
}

/**
 * Computes WhatsApp forward reach vs RaktSetu notifications avoided.
 * Clearly documented as simulated illustrative estimate.
 */
export function calculateImpactMetrics(actualNotifiedCount: number) {
  const { GROUPS_REACHED, AVG_GROUP_SIZE, OVERLAP_FACTOR } = CONFIG.WHATSAPP_SIMULATION;
  const estimatedReach = Math.round(GROUPS_REACHED * AVG_GROUP_SIZE * (1 - OVERLAP_FACTOR));
  const notificationsAvoided = Math.max(0, estimatedReach - actualNotifiedCount);

  return {
    estimatedReach,
    actualNotifiedCount,
    notificationsAvoided,
  };
}

/**
 * Pure escalation function to select the next batch of donors for a verified request.
 */
export function selectEscalationDonors(
  request: BloodRequest,
  hospital: Hospital,
  allDonors: Donor[],
  allBloodBanks: BloodBank[],
  currentIsoTime: string
): EscalationCandidateSelection {
  // Check if request is closed or fulfilled
  if (
    request.status === 'fulfilled' ||
    request.status === 'expired' ||
    request.status === 'rejected' ||
    request.status === 'cancelled' ||
    request.fulfilledUnits >= request.units
  ) {
    return {
      tier: request.tier,
      selectedDonors: [],
      shortfall: 0,
      flaggedBloodBanks: [],
      totalEligibleCompatible: 0,
      totalCompatible: 0,
      isRareGroup: isRareBloodGroup(request.bloodGroup),
      reachedMaxCap: false,
    };
  }

  // Check verification requirement
  if (request.verificationStatus !== 'verified') {
    throw new Error('Security Violation: Unverified requests cannot notify donors.');
  }

  const isRare = isRareBloodGroup(request.bloodGroup);
  const alreadyNotifiedIds = new Set(request.notifiedDonorIds || []);

  // Filter 1: Compatible donors
  // Filter 2: Eligible donors at current time
  const eligibleDonors: Donor[] = [];
  let totalCompatible = 0;

  for (const donor of allDonors) {
    const eligibility = checkDonorEligibility(donor, request.bloodGroup, currentIsoTime);
    if (eligibility.reason?.includes('not red-cell compatible')) {
      // not compatible
    } else {
      totalCompatible++;
    }

    if (eligibility.isEligible) {
      eligibleDonors.push(donor);
    }
  }

  // Rank all eligible donors by score
  const rankedEligible = rankDonors(
    eligibleDonors,
    request.bloodGroup,
    hospital.latitude,
    hospital.longitude
  );

  // Check global cap
  const maxCap = isRare
    ? CONFIG.MAX_NOTIFICATIONS_RARE
    : CONFIG.MAX_NOTIFICATIONS_PER_REQUEST;

  const currentNotifiedCount = alreadyNotifiedIds.size;
  const remainingBudget = Math.max(0, maxCap - currentNotifiedCount);

  if (remainingBudget <= 0) {
    return {
      tier: request.tier,
      selectedDonors: [],
      shortfall: 0,
      flaggedBloodBanks: [],
      totalEligibleCompatible: rankedEligible.length,
      totalCompatible,
      isRareGroup: isRare,
      reachedMaxCap: true,
    };
  }

  // Rare blood groups bypass tiers: 30 km sweep in one controlled operation
  if (isRare) {
    const candidatesWithinRadius = rankedEligible.filter(
      (scored) =>
        scored.components.distanceKm <= CONFIG.RARE_RADIUS_KM &&
        !alreadyNotifiedIds.has(scored.donor.id)
    );

    const selected = candidatesWithinRadius.slice(0, remainingBudget);
    const shortfall = Math.max(0, candidatesWithinRadius.length - selected.length);

    return {
      tier: 'rare',
      selectedDonors: selected,
      shortfall,
      flaggedBloodBanks: allBloodBanks.map((b) => ({ ...b, flagged: true })),
      totalEligibleCompatible: rankedEligible.length,
      totalCompatible,
      isRareGroup: true,
      reachedMaxCap: selected.length >= remainingBudget,
    };
  }

  // Standard non-rare tiers
  let targetTier: MatchingTier = 1;
  let radiusKm: number = CONFIG.TIERS.TIER_1.RADIUS_KM;
  let quota: number = CONFIG.TIERS.TIER_1.MAX_DONORS;
  let flagBloodBanks = false;

  if (request.tier === 0) {
    targetTier = 1;
    radiusKm = CONFIG.TIERS.TIER_1.RADIUS_KM;
    quota = CONFIG.TIERS.TIER_1.MAX_DONORS;
  } else if (request.tier === 1) {
    targetTier = 2;
    radiusKm = CONFIG.TIERS.TIER_2.RADIUS_KM;
    quota = CONFIG.TIERS.TIER_2.MAX_DONORS;
  } else if (request.tier === 2) {
    targetTier = 3;
    radiusKm = CONFIG.TIERS.TIER_3.RADIUS_KM;
    quota = CONFIG.TIERS.TIER_3.MAX_DONORS;
    flagBloodBanks = true;
  } else {
    // Already at Tier 3 or beyond
    return {
      tier: request.tier,
      selectedDonors: [],
      shortfall: 0,
      flaggedBloodBanks: [],
      totalEligibleCompatible: rankedEligible.length,
      totalCompatible,
      isRareGroup: false,
      reachedMaxCap: currentNotifiedCount >= maxCap,
    };
  }

  // Candidates within the tier's radius, excluding donors already notified
  const candidatesInRadius = rankedEligible.filter(
    (scored) =>
      scored.components.distanceKm <= radiusKm && !alreadyNotifiedIds.has(scored.donor.id)
  );

  const effectiveQuota = Math.min(quota, remainingBudget);
  const selected = candidatesInRadius.slice(0, effectiveQuota);
  const shortfall = Math.max(0, quota - selected.length);

  const flaggedBanks = flagBloodBanks
    ? allBloodBanks.map((b) => ({ ...b, flagged: true }))
    : [];

  return {
    tier: targetTier,
    selectedDonors: selected,
    shortfall,
    flaggedBloodBanks: flaggedBanks,
    totalEligibleCompatible: rankedEligible.length,
    totalCompatible,
    isRareGroup: false,
    reachedMaxCap: currentNotifiedCount + selected.length >= maxCap,
  };
}
