import {
  Donor,
  Hospital,
  BloodBank,
  BloodRequest,
  Notification,
  DonationEvent,
  AuditEntry,
  HistoricalRequest,
  ScheduledCamp,
  Campus,
} from '../../types';

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

export interface Repository {
  initialize(): Promise<AppDataStore>;
  getData(): Promise<AppDataStore>;
  saveData(data: AppDataStore): Promise<void>;
  
  // Specific entity accessors
  getDonors(): Promise<Donor[]>;
  getHospitals(): Promise<Hospital[]>;
  getBloodBanks(): Promise<BloodBank[]>;
  getRequests(): Promise<BloodRequest[]>;
  getRequestById(id: string): Promise<BloodRequest | null>;
  saveRequest(request: BloodRequest): Promise<void>;
  
  getNotifications(): Promise<Notification[]>;
  saveNotification(notification: Notification): Promise<void>;
  
  getDonationEvents(): Promise<DonationEvent[]>;
  saveDonationEvent(event: DonationEvent): Promise<void>;
  
  getAuditLogs(): Promise<AuditEntry[]>;
  appendAuditLog(entry: AuditEntry): Promise<void>;
  
  getHistoricalRequests(): Promise<HistoricalRequest[]>;
  getCampuses(): Promise<Campus[]>;
  getScheduledCamps(): Promise<ScheduledCamp[]>;
  saveScheduledCamp(camp: ScheduledCamp): Promise<void>;
  
  // Secret phone lookup (server-only)
  getRevealedPhone(donorId: string): Promise<string | null>;
}
