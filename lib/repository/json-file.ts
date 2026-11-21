import fs from 'fs';
import path from 'path';
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

export class JsonFileRepository implements Repository {
  private dataDir: string;
  private filePath: string;
  private secretPhonesPath: string;
  private memoryCache: AppDataStore | null = null;
  private secretPhonesCache: Map<string, string> = new Map();

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir || path.join(process.cwd(), '.data');
    this.filePath = path.join(this.dataDir, 'store.json');
    this.secretPhonesPath = path.join(this.dataDir, 'secret_phones.json');
  }

  async initialize(): Promise<AppDataStore> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as AppDataStore;
        this.memoryCache = parsed;
      } catch (err) {
        // Corrupt file recovery: backup corrupt file and start clean
        const backupPath = path.join(this.dataDir, `store.corrupt.${Date.now()}.bak`);
        try {
          fs.renameSync(this.filePath, backupPath);
        } catch {
          // ignore rename failure
        }
        this.memoryCache = null;
      }
    }

    if (fs.existsSync(this.secretPhonesPath)) {
      try {
        const raw = fs.readFileSync(this.secretPhonesPath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, string>;
        this.secretPhonesCache = new Map(Object.entries(parsed));
      } catch {
        this.secretPhonesCache = new Map();
      }
    }

    if (!this.memoryCache) {
      // Load from seed.json
      const seedPath = path.join(process.cwd(), 'data', 'seed.json');
      if (fs.existsSync(seedPath)) {
        const seedRaw = fs.readFileSync(seedPath, 'utf-8');
        const seedData = JSON.parse(seedRaw);
        this.memoryCache = {
          version: '1.0.0',
          seedHash: seedData.seedHash || 'default-seed',
          donors: seedData.donors || [],
          hospitals: seedData.hospitals || [],
          bloodBanks: seedData.bloodBanks || [],
          requests: seedData.requests || [],
          notifications: seedData.notifications || [],
          donationEvents: seedData.donationEvents || [],
          auditLogs: seedData.auditLogs || [],
          historicalRequests: seedData.historicalRequests || [],
          campuses: seedData.campuses || [],
          scheduledCamps: seedData.scheduledCamps || [],
        };

        if (seedData.secretPhones) {
          this.secretPhonesCache = new Map(Object.entries(seedData.secretPhones));
          this.persistSecretPhones();
        }

        await this.saveData(this.memoryCache);
      } else {
        this.memoryCache = {
          version: '1.0.0',
          seedHash: 'empty',
          donors: [],
          hospitals: [],
          bloodBanks: [],
          requests: [],
          notifications: [],
          donationEvents: [],
          auditLogs: [],
          historicalRequests: [],
          campuses: [],
          scheduledCamps: [],
        };
        await this.saveData(this.memoryCache);
      }
    }

    return this.memoryCache;
  }

  async getData(): Promise<AppDataStore> {
    if (!this.memoryCache) {
      return this.initialize();
    }
    return JSON.parse(JSON.stringify(this.memoryCache));
  }

  async saveData(data: AppDataStore): Promise<void> {
    this.memoryCache = JSON.parse(JSON.stringify(data));
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Atomic write via temp file + rename
    const tempFile = path.join(this.dataDir, `store.tmp.${Date.now()}`);
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, this.filePath);
  }

  private persistSecretPhones(): void {
    const obj = Object.fromEntries(this.secretPhonesCache.entries());
    const tempFile = path.join(this.dataDir, `phones.tmp.${Date.now()}`);
    fs.writeFileSync(tempFile, JSON.stringify(obj, null, 2), 'utf-8');
    fs.renameSync(tempFile, this.secretPhonesPath);
  }

  async getDonors(): Promise<Donor[]> {
    const data = await this.getData();
    return data.donors;
  }

  async getHospitals(): Promise<Hospital[]> {
    const data = await this.getData();
    return data.hospitals;
  }

  async getBloodBanks(): Promise<BloodBank[]> {
    const data = await this.getData();
    return data.bloodBanks;
  }

  async getRequests(): Promise<BloodRequest[]> {
    const data = await this.getData();
    return data.requests;
  }

  async getRequestById(id: string): Promise<BloodRequest | null> {
    const requests = await this.getRequests();
    const req = requests.find((r) => r.id === id);
    return req ? { ...req } : null;
  }

  async saveRequest(request: BloodRequest): Promise<void> {
    const data = await this.getData();
    const idx = data.requests.findIndex((r) => r.id === request.id);
    if (idx >= 0) {
      data.requests[idx] = { ...request };
    } else {
      data.requests.push({ ...request });
    }
    await this.saveData(data);
  }

  async getNotifications(): Promise<Notification[]> {
    const data = await this.getData();
    return data.notifications;
  }

  async saveNotification(notification: Notification): Promise<void> {
    const data = await this.getData();
    const idx = data.notifications.findIndex((n) => n.id === notification.id);
    if (idx >= 0) {
      data.notifications[idx] = { ...notification };
    } else {
      data.notifications.push({ ...notification });
    }
    await this.saveData(data);
  }

  async getDonationEvents(): Promise<DonationEvent[]> {
    const data = await this.getData();
    return data.donationEvents;
  }

  async saveDonationEvent(event: DonationEvent): Promise<void> {
    const data = await this.getData();
    data.donationEvents.push({ ...event });
    await this.saveData(data);
  }

  async getAuditLogs(): Promise<AuditEntry[]> {
    const data = await this.getData();
    return data.auditLogs;
  }

  async appendAuditLog(entry: AuditEntry): Promise<void> {
    const data = await this.getData();
    data.auditLogs.push({ ...entry });
    await this.saveData(data);
  }

  async getHistoricalRequests(): Promise<HistoricalRequest[]> {
    const data = await this.getData();
    return data.historicalRequests;
  }

  async getCampuses(): Promise<Campus[]> {
    const data = await this.getData();
    return data.campuses;
  }

  async getScheduledCamps(): Promise<ScheduledCamp[]> {
    const data = await this.getData();
    return data.scheduledCamps;
  }

  async saveScheduledCamp(camp: ScheduledCamp): Promise<void> {
    const data = await this.getData();
    const idx = data.scheduledCamps.findIndex((c) => c.id === camp.id);
    if (idx >= 0) {
      data.scheduledCamps[idx] = { ...camp };
    } else {
      data.scheduledCamps.push({ ...camp });
    }
    await this.saveData(data);
  }

  async getRevealedPhone(donorId: string): Promise<string | null> {
    return this.secretPhonesCache.get(donorId) ?? null;
  }
}
