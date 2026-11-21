import { BloodGroup } from '../../types';

/**
 * Red Blood Cell (RBC) Recipient Compatibility Table.
 * Maps recipient group -> list of compatible donor groups.
 *
 * Medical Notice:
 * Transfusion compatibility must be confirmed by treating hospital and laboratory crossmatching.
 * RaktSetu is a donor discovery aid, not a medical authority.
 */
export const RBC_RECIPIENT_COMPATIBILITY: Readonly<Record<BloodGroup, readonly BloodGroup[]>> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
} as const;

/**
 * Dynamically inverted compatibility table (donor group -> recipient groups donor can give to).
 * SPEC §6.A requirement: derive donor->recipients by INVERTING the table in code (no second hand-typed table).
 */
export function deriveDonorToRecipientsMap(): Record<BloodGroup, BloodGroup[]> {
  const allGroups: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const donorMap: Record<BloodGroup, BloodGroup[]> = {
    'O-': [],
    'O+': [],
    'A-': [],
    'A+': [],
    'B-': [],
    'B+': [],
    'AB-': [],
    'AB+': [],
  };

  for (const recipientGroup of allGroups) {
    const compatibleDonors = RBC_RECIPIENT_COMPATIBILITY[recipientGroup];
    for (const donorGroup of compatibleDonors) {
      if (!donorMap[donorGroup].includes(recipientGroup)) {
        donorMap[donorGroup].push(recipientGroup);
      }
    }
  }

  return donorMap;
}

export const RBC_DONOR_COMPATIBILITY: Readonly<Record<BloodGroup, readonly BloodGroup[]>> =
  deriveDonorToRecipientsMap();

/**
 * Returns true if a donor group can give red blood cells to a recipient group.
 */
export function isBloodCompatible(donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean {
  return RBC_RECIPIENT_COMPATIBILITY[recipientGroup].includes(donorGroup);
}

/**
 * Returns all compatible donor blood groups for a given recipient blood group.
 */
export function getCompatibleDonorGroups(recipientGroup: BloodGroup): readonly BloodGroup[] {
  return RBC_RECIPIENT_COMPATIBILITY[recipientGroup];
}
