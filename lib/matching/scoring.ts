import { Donor, BloodGroup, MatchScoreComponents, ScoredDonor } from '../../types';
import { CONFIG } from '../config';
import { calculateHaversineKm } from './haversine';

export function calculateMatchScore(
  donor: Donor,
  requestedGroup: BloodGroup,
  targetLat: number,
  targetLng: number
): MatchScoreComponents {
  const distanceKm = calculateHaversineKm(donor.latitude, donor.longitude, targetLat, targetLng);

  // Exponential distance decay: exp(-d / lambda)
  const proximity = Math.exp(-distanceKm / CONFIG.LAMBDA_KM);

  // Exact match bonus: 1 if exact match, 0 if compatible but different group
  const exactMatch = donor.bloodGroup === requestedGroup ? 1.0 : 0.0;

  // Reliability & responseRate are already normalized in [0, 1]
  const reliabilityScore = Math.min(1.0, Math.max(0.0, donor.reliabilityScore));
  const responseRate = Math.min(1.0, Math.max(0.0, donor.responseRate));

  const compositeScore =
    CONFIG.WEIGHTS.PROXIMITY * proximity +
    CONFIG.WEIGHTS.EXACT_MATCH * exactMatch +
    CONFIG.WEIGHTS.RELIABILITY * reliabilityScore +
    CONFIG.WEIGHTS.RESPONSE_RATE * responseRate;

  return {
    proximity: Math.round(proximity * 1000) / 1000,
    exactMatch,
    reliabilityScore,
    responseRate,
    compositeScore: Math.round(compositeScore * 10000) / 10000,
    distanceKm: Math.round(distanceKm * 100) / 100,
  };
}

/**
 * Ranks a list of donors against a request's blood group and target coordinates.
 * Deterministic multi-key sort:
 * 1. compositeScore desc
 * 2. exactMatch desc
 * 3. distanceKm asc
 * 4. donor id asc (stable tiebreak)
 */
export function rankDonors(
  donors: Donor[],
  requestedGroup: BloodGroup,
  targetLat: number,
  targetLng: number
): ScoredDonor[] {
  const scored = donors.map((donor) => ({
    donor,
    components: calculateMatchScore(donor, requestedGroup, targetLat, targetLng),
  }));

  scored.sort((a, b) => {
    // 1. Score desc
    if (Math.abs(b.components.compositeScore - a.components.compositeScore) > 0.0001) {
      return b.components.compositeScore - a.components.compositeScore;
    }
    // 2. Exact match priority
    if (b.components.exactMatch !== a.components.exactMatch) {
      return b.components.exactMatch - a.components.exactMatch;
    }
    // 3. Distance asc
    if (Math.abs(a.components.distanceKm - b.components.distanceKm) > 0.01) {
      return a.components.distanceKm - b.components.distanceKm;
    }
    // 4. Stable donor id asc
    return a.donor.id.localeCompare(b.donor.id);
  });

  return scored;
}
