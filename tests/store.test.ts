import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonFileRepository } from '../lib/repository/json-file';
import { stepSimulatedResponses } from '../lib/simulation/response-simulator';
import { useAppStore } from '../store/useAppStore';
import { AppDataStore, BloodRequest, Notification } from '../types';

const TEST_DATA_DIR = path.join(process.cwd(), '.data-test');

describe('Phase 3: State Management & Persistence Tests', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('1. performs persistence round-trip using atomic JSON repository', async () => {
    const repo = new JsonFileRepository(TEST_DATA_DIR);
    await repo.initialize();

    const sampleRequest: BloodRequest = {
      id: 'req-persist-1',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: 'hosp-1',
      urgency: 'critical',
      createdAt: '2026-11-21T12:00:00.000Z',
      expiresAt: '2026-11-21T16:00:00.000Z',
      status: 'matching',
      verifiedBy: 'Dr. Kulkarni',
      verificationStatus: 'verified',
      tier: 1,
      acceptedDonorIds: [],
      notifiedDonorIds: ['donor-001'],
      fulfilledUnits: 0,
      requester: { name: 'Priya', phone: '+91 99999 11111', hospitalPatientId: 'P-99' },
    };

    await repo.saveRequest(sampleRequest);

    // Create a new repository instance pointing to the same directory to verify disk persistence
    const reloadedRepo = new JsonFileRepository(TEST_DATA_DIR);
    await reloadedRepo.initialize();
    const fetched = await reloadedRepo.getRequestById('req-persist-1');

    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe('req-persist-1');
    expect(fetched?.bloodGroup).toBe('B+');
    expect(fetched?.requester?.name).toBe('Priya');
  });

  it('2. recovers safely from corrupt store.json without crashing', async () => {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    const storePath = path.join(TEST_DATA_DIR, 'store.json');

    // Write malformed/corrupt JSON
    fs.writeFileSync(storePath, '{ corrupt_data: invalid_syntax, [ incomplete');

    const repo = new JsonFileRepository(TEST_DATA_DIR);
    // Should NOT throw, but recover cleanly
    const data = await repo.initialize();
    expect(data).toBeDefined();
    expect(data.version).toBe('1.0.0');

    // Verify backup file was created
    const files = fs.readdirSync(TEST_DATA_DIR);
    const backupFile = files.find((f) => f.includes('store.corrupt.'));
    expect(backupFile).toBeDefined();
  });

  it('3. runs pure response simulation when clock advances', () => {
    const initialStore: AppDataStore = {
      version: '1.0.0',
      seedHash: 'sim-seed',
      donors: [
        {
          id: 'donor-resp-1',
          firstName: 'Swapnil',
          bloodGroup: 'B+',
          sex: 'male',
          lastDonationDate: '2026-01-01',
          area: 'Shivajinagar',
          latitude: 18.53,
          longitude: 73.84,
          reliabilityScore: 0.95,
          responseRate: 0.99, // high response rate to ensure acceptance
          isOptedIn: true,
          college: null,
          maskedPhone: '+91 XXXXX XX101',
          availabilityStatus: 'available',
        },
      ],
      hospitals: [],
      bloodBanks: [],
      requests: [
        {
          id: 'req-sim-1',
          bloodGroup: 'B+',
          units: 1,
          hospitalId: 'hosp-1',
          urgency: 'critical',
          createdAt: '2026-11-21T12:00:00.000Z',
          expiresAt: '2026-11-21T16:00:00.000Z',
          status: 'matching',
          verifiedBy: 'Dr. Patil',
          verificationStatus: 'verified',
          tier: 1,
          acceptedDonorIds: [],
          notifiedDonorIds: ['donor-resp-1'],
          fulfilledUnits: 0,
          requester: { name: 'Kavita', phone: '+91 98222 00000', hospitalPatientId: 'P-1' },
        },
      ],
      notifications: [
        {
          id: 'notif-sim-1',
          requestId: 'req-sim-1',
          donorId: 'donor-resp-1',
          tier: 1,
          sentAt: '2026-11-21T12:00:00.000Z',
          status: 'sent',
        },
      ],
      donationEvents: [],
      auditLogs: [],
      historicalRequests: [],
      campuses: [],
      scheduledCamps: [],
    };

    // Step 1: at 1 minute after sentAt (delay not met yet)
    const step1 = stepSimulatedResponses(initialStore, '2026-11-21T12:01:00.000Z');
    expect(step1.emittedEvents.length).toBe(0);

    // Step 2: at 8 minutes after sentAt (delay passed)
    const step2 = stepSimulatedResponses(initialStore, '2026-11-21T12:08:00.000Z');
    expect(step2.emittedEvents.length).toBeGreaterThan(0);
    const updatedReq = step2.nextState.requests.find((r) => r.id === 'req-sim-1');
    expect(updatedReq?.acceptedDonorIds).toContain('donor-resp-1');
    expect(updatedReq?.status).toBe('fulfilled');
    expect(step2.nextState.donationEvents.length).toBe(1);
  });

  it('4. tests Zustand store actions: initialize, createRequest, verify, clock controls', async () => {
    const store = useAppStore.getState();

    const mockData: AppDataStore = {
      version: '1.0.0',
      seedHash: 'mock-hash',
      donors: [],
      hospitals: [
        {
          id: 'hosp-1',
          name: 'Ruby Hall Clinic',
          area: 'Sassoon Road',
          latitude: 18.5326,
          longitude: 73.8776,
          contact: '+91 20 6645 5100',
          hasBloodBank: true,
        },
      ],
      bloodBanks: [],
      requests: [],
      notifications: [],
      donationEvents: [],
      auditLogs: [],
      historicalRequests: [],
      campuses: [],
      scheduledCamps: [],
    };

    store.initialize(mockData);
    expect(useAppStore.getState().isInitialized).toBe(true);

    // Create request
    const newReq: BloodRequest = {
      id: 'store-req-1',
      bloodGroup: 'B+',
      units: 2,
      hospitalId: 'hosp-1',
      urgency: 'critical',
      createdAt: '2026-11-21T12:00:00.000Z',
      expiresAt: '2026-11-21T16:00:00.000Z',
      status: 'open',
      verifiedBy: null,
      verificationStatus: 'pending',
      tier: 0,
      acceptedDonorIds: [],
      notifiedDonorIds: [],
      fulfilledUnits: 0,
      requester: { name: 'Aarav', phone: '+91 98888 77777', hospitalPatientId: 'P-44' },
      verificationCode: 'TEST-9999',
    };

    await store.createRequest(newReq);
    expect(useAppStore.getState().data.requests.length).toBe(1);
    expect(useAppStore.getState().ui.activeRequestId).toBe('store-req-1');

    // Verify request
    const verifyRes = await store.verifyRequest('store-req-1', 'TEST-9999');
    expect(verifyRes.success).toBe(true);
    const verifiedReq = useAppStore.getState().data.requests.find((r) => r.id === 'store-req-1');
    expect(verifiedReq?.verificationStatus).toBe('verified');

    // Clock controls
    store.advanceClock(10);
    const clockIso = useAppStore.getState().clock.currentIso;
    expect(Date.parse(clockIso)).toBeGreaterThan(Date.parse('2026-11-21T12:00:00.000Z'));
  });
});
