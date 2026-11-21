export type BloodGroup = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export type Sex = 'male' | 'female';

export type DonorAvailability = 'available' | 'busy' | 'unavailable';

export interface Donor {
  id: string;
  firstName: string;
  bloodGroup: BloodGroup;
  sex: Sex;
  lastDonationDate: string; // YYYY-MM-DD
  area: string;
  latitude: number;
  longitude: number;
  reliabilityScore: number; // 0 - 1
  responseRate: number; // 0 - 1
  isOptedIn: boolean;
  college: string | null;
  maskedPhone: string; // e.g. "+91 XXXXX XX482"
  availabilityStatus: DonorAvailability;
}

export interface Hospital {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  contact: string;
  hasBloodBank: boolean;
}

export interface BloodBank {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  contact: string;
  flagged?: boolean;
}

export type UrgencyLevel = 'critical' | 'urgent' | 'planned';
export type RequestStatus = 'open' | 'matching' | 'fulfilled' | 'expired' | 'rejected' | 'cancelled';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type MatchingTier = 0 | 1 | 2 | 3 | 'rare';

export interface RequesterContact {
  name: string;
  phone: string;
  hospitalPatientId: string;
}

export interface BloodRequest {
  id: string;
  bloodGroup: BloodGroup;
  units: number;
  hospitalId: string;
  urgency: UrgencyLevel;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  status: RequestStatus;
  verifiedBy: string | null;
  verificationStatus: VerificationStatus;
  tier: MatchingTier;
  acceptedDonorIds: string[];
  notifiedDonorIds: string[];
  fulfilledUnits: number;
  requester: RequesterContact | null; // PII that gets purged 24h after closure
  verificationCode?: string; // Simulated hospital code / OTP shown for demo
  verificationAttempts?: number;
}

export type VerifiedRequest = BloodRequest & {
  verificationStatus: 'verified';
};

export type NotificationStatus = 'sent' | 'accepted' | 'declined' | 'expired';

export interface Notification {
  id: string;
  requestId: string;
  donorId: string;
  tier: 1 | 2 | 3 | 'rare';
  sentAt: string;
  status: NotificationStatus;
  responseAt?: string;
  declineReason?: string;
}

export interface DonationEvent {
  id: string;
  requestId: string;
  donorId: string;
  units: number;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  requestId: string;
  donorId?: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface HistoricalRequest {
  id: string;
  bloodGroup: BloodGroup;
  hospitalId: string;
  hospitalName: string;
  requestDate: string; // ISO
  unitsRequired: number;
  urgency: UrgencyLevel;
  status: 'fulfilled' | 'partially_fulfilled' | 'expired';
  responseTimeMinutes: number;
}

export interface Campus {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  donorCount: number;
  activeDonors: number;
  successfulDonations: number;
}

export interface ScheduledCamp {
  id: string;
  collegeId: string;
  collegeName: string;
  date: string;
  targetGroups: BloodGroup[];
  expectedDonors: number;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface AppDataStore {
  version: string;
  seedHash: string;
  donors: Donor[];
  hospitals: Hospital[];
  bloodBanks: BloodBank[];
  requests: BloodRequest[];
  notifications: Notification[];
  donationEvents: DonationEvent[];
  auditLogs: AuditEntry[];
  historicalRequests: HistoricalRequest[];
  campuses: Campus[];
  scheduledCamps: ScheduledCamp[];
}

// Domain Events for pure event-sourcing fold
export type DomainEvent =
  | { type: 'RequestCreated'; payload: BloodRequest; timestamp: string }
  | { type: 'VerificationSucceeded'; payload: { requestId: string; verifiedBy: string }; timestamp: string }
  | { type: 'VerificationFailed'; payload: { requestId: string; attempts: number }; timestamp: string }
  | { type: 'TierNotified'; payload: { requestId: string; tier: MatchingTier; donorIds: string[]; notifications: Notification[] }; timestamp: string }
  | { type: 'DonorAccepted'; payload: { requestId: string; donorId: string; notificationId: string }; timestamp: string }
  | { type: 'DonorDeclined'; payload: { requestId: string; donorId: string; notificationId: string; reason?: string }; timestamp: string }
  | { type: 'UnitsFulfilled'; payload: { requestId: string; unitsFulfilled: number; donationEvent: DonationEvent }; timestamp: string }
  | { type: 'RequestExpired'; payload: { requestId: string }; timestamp: string }
  | { type: 'RequestCancelled'; payload: { requestId: string; reason: string }; timestamp: string }
  | { type: 'ContactRevealed'; payload: { requestId: string; donorId: string; auditEntry: AuditEntry }; timestamp: string }
  | { type: 'PiiPurged'; payload: { requestId: string }; timestamp: string };

// Clock and PRNG interfaces for pure operations
export interface Clock {
  now(): string; // Returns ISO timestamp
  unixMs(): number;
}

export interface Rng {
  next(): number; // [0, 1)
  nextInt(min: number, max: number): number; // [min, max]
}

export interface MatchScoreComponents {
  proximity: number;
  exactMatch: number;
  reliabilityScore: number;
  responseRate: number;
  compositeScore: number;
  distanceKm: number;
}

export interface ScoredDonor {
  donor: Donor;
  components: MatchScoreComponents;
}
