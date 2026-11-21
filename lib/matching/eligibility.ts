import { Donor, BloodGroup } from '../../types';
import { CONFIG } from '../config';
import { isBloodCompatible } from './compatibility';

export interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
  daysSinceLastDonation: number;
  requiredIntervalDays: number;
}

/**
 * Pure function evaluating donor eligibility for a given blood request at a specific time.
 * SPEC §6.B:
 * A donor is eligible iff:
 * - isOptedIn is true
 * - availabilityStatus === 'available'
 * - whole days since last donation >= interval (men 90, women 120; from config)
 * - compatible with the requested blood group
 *
 * Boundary rules:
 * N-1 days -> ineligible
 * N days -> eligible
 */
export function checkDonorEligibility(
  donor: Donor,
  requestedGroup: BloodGroup,
  currentIsoTime: string
): EligibilityResult {
  // 1. Opt-in status check
  if (!donor.isOptedIn) {
    return {
      isEligible: false,
      reason: 'Donor has opted out of notifications',
      daysSinceLastDonation: 0,
      requiredIntervalDays: 0,
    };
  }

  // 2. Availability status
  if (donor.availabilityStatus !== 'available') {
    return {
      isEligible: false,
      reason: `Donor status is ${donor.availabilityStatus}`,
      daysSinceLastDonation: 0,
      requiredIntervalDays: 0,
    };
  }

  // 3. Blood compatibility
  if (!isBloodCompatible(donor.bloodGroup, requestedGroup)) {
    return {
      isEligible: false,
      reason: `Donor group ${donor.bloodGroup} is not red-cell compatible with recipient group ${requestedGroup}`,
      daysSinceLastDonation: 0,
      requiredIntervalDays: 0,
    };
  }

  // 4. Donation interval (cooling-off period)
  // Interval config: Verify against NBTC/official guidelines.
  const requiredIntervalDays =
    donor.sex === 'male'
      ? CONFIG.DONATION_INTERVAL_DAYS_MALE
      : CONFIG.DONATION_INTERVAL_DAYS_FEMALE;

  const currentMidnightMs = Date.parse(currentIsoTime.split('T')[0] + 'T00:00:00.000Z');
  const lastDonationMidnightMs = Date.parse(donor.lastDonationDate.split('T')[0] + 'T00:00:00.000Z');

  const diffMs = currentMidnightMs - lastDonationMidnightMs;
  const daysSinceLastDonation = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (daysSinceLastDonation < requiredIntervalDays) {
    return {
      isEligible: false,
      reason: `Cooling-off interval not met: ${daysSinceLastDonation} days since last donation (requires ${requiredIntervalDays} days)`,
      daysSinceLastDonation,
      requiredIntervalDays,
    };
  }

  return {
    isEligible: true,
    daysSinceLastDonation,
    requiredIntervalDays,
  };
}
