// ========================================================================
// SaniTrack TypeScript Type Definitions
// ========================================================================

export type UserRole =
  | 'guest'
  | 'citizen'
  | 'operator'
  | 'worker'
  | 'municipal_officer'
  | 'funding_partner'
  | 'admin'
  | 'auditor';

export type ToiletStatus =
  | 'open'
  | 'closed'
  | 'temporarily_unavailable'
  | 'under_maintenance'
  | 'unknown';

export type SourceType =
  | 'official'
  | 'operator'
  | 'community'
  | 'sample';

export type StockStatus =
  | 'available'
  | 'low'
  | 'out_of_stock'
  | 'unknown';

export type PaymentType =
  | 'free'
  | 'paid'
  | 'unknown'
  | 'not_applicable';

export type ComplaintStatus =
  | 'submitted'
  | 'triage'
  | 'assigned'
  | 'in_progress'
  | 'resolved_pending_verification'
  | 'resolved'
  | 'rejected'
  | 'duplicate'
  | 'reopened'
  | 'escalated';

export type PriorityLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type CampaignStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pledged'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'demo';

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  wardId?: string;
  organizationName?: string;
  assignedToiletIds?: string[];
  avatarUrl?: string;
}

export interface Ward {
  id: string;
  wardNumber: number;
  name: string;
  zone: string;
  officeAddress: string;
  contactPhone: string;
  officerName: string;
  centerLatitude: number;
  centerLongitude: number;
}

export interface ToiletSection {
  id: string;
  toiletId: string;
  sectionType: 'women' | 'men' | 'unisex' | 'accessible' | 'family';
  cubiclesCount: number;
  urinalsCount: number;
  hasWesternCommode: boolean;
  hasIndianToilet: boolean;
}

export interface ToiletFacilities {
  toiletId: string;
  hasRunningWater: boolean;
  hasElectricity: boolean;
  hasAdequateLighting: boolean;
  soapAvailable: boolean;
  handwashBasin: boolean;
  hasMirror: boolean;
  hasExhaustFan: boolean;
  // Accessibility
  wheelchairRamp: boolean;
  grabBars: boolean;
  wideDoorway: boolean;
  accessibleBasin: boolean;
  // Safety & Approach
  hasCaretaker: boolean;
  wellLitApproach: boolean;
  cctvOutsideApproach: boolean;
  lastInspectedAt: string;
  // Senior & Maternal Facilities
  hasAdultDiapers?: boolean;
  hasSeniorDiapers?: boolean;
  hasDiaperChangingStation?: boolean;
}

export interface SanitaryFacility {
  id: string;
  toiletId: string;
  facilityType: 'pad_dispenser' | 'adult_diaper_dispenser' | 'sanitary_bin' | 'incinerator' | 'changing_area';
  itemCategory?: 'pads' | 'adult_diapers' | 'both' | 'hygiene';
  itemDetails?: string;
  availability: boolean;
  paymentType: PaymentType;
  pricePerPad?: number;
  pricePerDiaper?: number;
  operationalStatus: 'operational' | 'out_of_order' | 'maintenance';
  currentStock: StockStatus;
  diaperStock?: StockStatus;
  lastRefilledAt: string;
  lastVerifiedAt: string;
  verificationSource: string;
  sponsorName?: string;
}

export interface Toilet {
  id: string;
  facilityCode: string;
  name: string;
  description: string;
  address: string;
  locality: string;
  wardId: string;
  latitude: number;
  longitude: number;
  entryFee: number; // 0 for free
  openingHours: {
    open: string;
    close: string;
    is24x7: boolean;
  };
  isPublic: boolean;
  recordSource: SourceType;
  verificationStatus: 'verified_official' | 'operator_audited' | 'community_reported' | 'demo_sample';
  operatorId?: string;
  operatorName?: string;
  currentStatus: ToiletStatus;
  statusFreshness: string; // e.g. "Operator update · 15 mins ago"
  rating: number;
  reviewCount: number;
  sections: ToiletSection[];
  facilities: ToiletFacilities;
  sanitaryFacilities?: SanitaryFacility[];
  lastVerifiedAt: string;
  // Night ranking metadata
  nightRatingScore?: number;
  nightBadges?: string[];
  distanceKm?: number;
}

export interface ComplaintAttachment {
  id: string;
  complaintId: string;
  storagePath: string;
  fileType: string;
  caption?: string;
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  previousStatus?: ComplaintStatus;
  newStatus: ComplaintStatus;
  actorName: string;
  actorRole: UserRole;
  notes: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  referenceCode: string;
  toiletId: string;
  toiletName: string;
  category: string;
  description: string;
  priority: PriorityLevel;
  status: ComplaintStatus;
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  isAnonymous: boolean;
  isPublicSummary: boolean;
  assignedToName?: string;
  assignedWardName?: string;
  estimatedCost?: number;
  eligibleForCampaign: boolean;
  campaignId?: string;
  attachments?: ComplaintAttachment[];
  events: ComplaintEvent[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolutionPhotoPath?: string;
  // Civic AI Grievance Dispatch & Governor Department Link
  aiDispatched?: boolean;
  aiDispatchSummary?: string;
  aiAssignedDepartment?: string;
  officialActionToken?: string;
  tempDispatchStatus?: 'active' | 'resolved' | 'purged';
  purgedAt?: string;
}

export interface CleaningLog {
  id: string;
  toiletId: string;
  toiletName: string;
  workerName: string;
  cleanedAt: string;
  floorCleaned: boolean;
  fixturesDisinfected: boolean;
  waterChecked: boolean;
  soapRefilled: boolean;
  wasteEmptied: boolean;
  padStockChecked: boolean;
  notes?: string;
  photoUrl?: string;
}

export interface MaintenanceTask {
  id: string;
  toiletId: string;
  toiletName: string;
  complaintId?: string;
  title: string;
  description?: string;
  assignedWorkerName?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  priority: PriorityLevel;
  dueDate: string;
  completedAt?: string;
  evidencePhotoPath?: string;
  createdAt: string;
}

export interface CampaignExpense {
  id: string;
  campaignId: string;
  description: string;
  vendorName: string;
  amount: number;
  invoiceNumber: string;
  receiptPath?: string;
  approvedByName: string;
  createdAt: string;
}

export interface CampaignDonation {
  id: string;
  campaignId: string;
  donorName: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  providerReference?: string;
  paymentStatus: PaymentStatus;
  isPublic: boolean;
  message?: string;
  createdAt: string;
}

export interface CampaignUpdate {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  imagePath?: string;
  postedByName: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  toiletId: string;
  toiletName: string;
  locality: string;
  complaintId?: string;
  targetAmount: number;
  raisedAmount: number;
  spentAmount: number;
  status: CampaignStatus;
  partnerOrganizationName: string;
  createdByName: string;
  approvedByName?: string;
  startDate: string;
  endDate?: string;
  beforeRepairPhoto?: string;
  afterRepairPhoto?: string;
  expenses: CampaignExpense[];
  donations: CampaignDonation[];
  updates: CampaignUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface ToiletReview {
  id: string;
  toiletId: string;
  userName: string;
  rating: number;
  cleanlinessRating: number;
  waterRating: number;
  odorRating: number;
  comment: string;
  isVerifiedVisit: boolean;
  createdAt: string;
}
