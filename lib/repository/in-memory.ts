import { Repository, AppDataStore } from './interface';
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

export class InMemoryRepository implements Repository {
  private data: AppDataStore;
  private secretPhones: Map<string, string>;

  constructor(initialData?: Partial<AppDataStore>, secretPhonesMap?: Map<string, string>) {
    this.data = {
      version: '1.0.0',
      seedHash: 'in-memory-seed',
      donors: initialData?.donors ?? [],
      hospitals: initialData?.hospitals ?? [],
      bloodBanks: initialData?.bloodBanks ?? [],
      requests: initialData?.requests ?? [],
      notifications: initialData?.notifications ?? [],
      donationEvents: initialData?.donationEvents ?? [],
      auditLogs: initialData?.auditLogs ?? [],
      historicalRequests: initialData?.historicalRequests ?? [],
      campuses: initialData?.campuses ?? [],
      scheduledCamps: initialData?.scheduledCamps ?? [],
    };
    this.secretPhones = secretPhonesMap ?? new Map();
  }

  async initialize(): Promise<AppDataStore> {
    return this.getData();
  }

  async getData(): Promise<AppDataStore> {
    return JSON.parse(JSON.stringify(this.data));
  }

  async saveData(data: AppDataStore): Promise<void> {
    this.data = JSON.parse(JSON.stringify(data));
  }

  async getDonors(): Promise<Donor[]> {
    return [...this.data.donors];
  }

  async getHospitals(): Promise<Hospital[]> {
    return [...this.data.hospitals];
  }

  async getBloodBanks(): Promise<BloodBank[]> {
    return [...this.data.bloodBanks];
  }

  async getRequests(): Promise<BloodRequest[]> {
    return [...this.data.requests];
  }

  async getRequestById(id: string): Promise<BloodRequest | null> {
    const found = this.data.requests.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async saveRequest(request: BloodRequest): Promise<void> {
    const idx = this.data.requests.findIndex((r) => r.id === request.id);
    if (idx >= 0) {
      this.data.requests[idx] = { ...request };
    } else {
      this.data.requests.push({ ...request });
    }
  }

  async getNotifications(): Promise<Notification[]> {
    return [...this.data.notifications];
  }

  async saveNotification(notification: Notification): Promise<void> {
    const idx = this.data.notifications.findIndex((n) => n.id === notification.id);
    if (idx >= 0) {
      this.data.notifications[idx] = { ...notification };
    } else {
      this.data.notifications.push({ ...notification });
    }
  }

  async getDonationEvents(): Promise<DonationEvent[]> {
    return [...this.data.donationEvents];
  }

  async saveDonationEvent(event: DonationEvent): Promise<void> {
    this.data.donationEvents.push({ ...event });
  }

  async getAuditLogs(): Promise<AuditEntry[]> {
    return [...this.data.auditLogs];
  }

  async appendAuditLog(entry: AuditEntry): Promise<void> {
    this.data.auditLogs.push({ ...entry });
  }

  async getHistoricalRequests(): Promise<HistoricalRequest[]> {
    return [...this.data.historicalRequests];
  }

  async getCampuses(): Promise<Campus[]> {
    return [...this.data.campuses];
  }

  async getScheduledCamps(): Promise<ScheduledCamp[]> {
    return [...this.data.scheduledCamps];
  }

  async saveScheduledCamp(camp: ScheduledCamp): Promise<void> {
    const idx = this.data.scheduledCamps.findIndex((c) => c.id === camp.id);
    if (idx >= 0) {
      this.data.scheduledCamps[idx] = { ...camp };
    } else {
      this.data.scheduledCamps.push({ ...camp });
    }
  }

  async getRevealedPhone(donorId: string): Promise<string | null> {
    return this.secretPhones.get(donorId) ?? null;
  }

  setRevealedPhone(donorId: string, phone: string): void {
    this.secretPhones.set(donorId, phone);
  }
}
