import { create } from 'zustand';
import {
  AppDataStore,
  BloodGroup,
  BloodRequest,
  DomainEvent,
  ScheduledCamp,
  Notification,
  AuditEntry,
  Donor,
} from '../types';
import { CONFIG } from '../lib/config';
import { reduceDomainEvent } from '../lib/matching/lifecycle';
import { selectEscalationDonors } from '../lib/matching/escalation';
import { stepSimulatedResponses } from '../lib/simulation/response-simulator';

export type ActiveView =
  | 'map'
  | 'request'
  | 'donor'
  | 'impact'
  | 'heatmap'
  | 'forecast'
  | 'campus'
  | 'privacy';

export interface ClockState {
  currentIso: string;
  speed: 1 | 5 | 20;
  isPaused: boolean;
}

export interface UiState {
  selectedBloodGroup: 'ALL' | BloodGroup;
  activeRequestId: string | null;
  activeView: ActiveView;
  isPresenterMode: boolean;
  mapPulseActive: boolean;
  notificationMessage: string | null;
}

export interface AppState {
  // Core Store Data
  data: AppDataStore;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Clock
  clock: ClockState;
  autoSimulateResponses: boolean;

  // UI state
  ui: UiState;

  // Actions
  initialize: (initialData?: AppDataStore) => void;
  fetchStoreData: () => Promise<void>;
  dispatchDomainEvent: (event: DomainEvent) => void;

  createRequest: (request: BloodRequest) => Promise<BloodRequest>;
  verifyRequest: (requestId: string, code: string, verifiedBy?: string) => Promise<{ success: boolean; error?: string }>;
  escalateRequest: (requestId: string) => void;
  donorAccept: (requestId: string, donorId: string, notificationId: string) => Promise<void>;
  donorDecline: (requestId: string, donorId: string, notificationId: string, reason?: string) => Promise<void>;
  revealDonorContact: (requestId: string, donorId: string) => Promise<string | null>;

  scheduleCamp: (camp: ScheduledCamp) => Promise<void>;

  // Clock controls
  advanceClock: (minutes: number) => void;
  setClockSpeed: (speed: 1 | 5 | 20) => void;
  toggleClockPause: () => void;
  setAutoSimulate: (enabled: boolean) => void;

  // UI controls
  setSelectedBloodGroup: (group: 'ALL' | BloodGroup) => void;
  setActiveView: (view: ActiveView) => void;
  setActiveRequestId: (id: string | null) => void;
  togglePresenterMode: () => void;
  setNotificationMessage: (msg: string | null) => void;
}

const DEFAULT_DATA: AppDataStore = {
  version: '1.0.0',
  seedHash: 'default',
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

export const useAppStore = create<AppState>((set, get) => ({
  data: DEFAULT_DATA,
  isInitialized: false,
  isLoading: false,
  error: null,

  clock: {
    currentIso: CONFIG.ANCHOR_DATE,
    speed: 1,
    isPaused: false,
  },
  autoSimulateResponses: true,

  ui: {
    selectedBloodGroup: 'ALL',
    activeRequestId: null,
    activeView: 'map',
    isPresenterMode: false,
    mapPulseActive: true,
    notificationMessage: null,
  },

  initialize: (initialData?: AppDataStore) => {
    if (initialData) {
      set({ data: initialData, isInitialized: true, isLoading: false });
    }
  },

  fetchStoreData: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        set({
          data: json.data,
          isInitialized: true,
          isLoading: false,
          ui: {
            ...get().ui,
            activeRequestId: json.data.requests?.[0]?.id || null,
          },
        });
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch store data',
      });
    }
  },

  dispatchDomainEvent: (event: DomainEvent) => {
    const currentState = get().data;
    const nextState = reduceDomainEvent(currentState, event);
    set({ data: nextState });

    // Asynchronously sync to local JSON store in background
    if (typeof window !== 'undefined') {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      }).catch(() => {
        // Silent sync failure fallback
      });
    }
  },

  createRequest: async (request: BloodRequest) => {
    const event: DomainEvent = {
      type: 'RequestCreated',
      payload: request,
      timestamp: get().clock.currentIso,
    };
    get().dispatchDomainEvent(event);
    set((state) => ({
      ui: { ...state.ui, activeRequestId: request.id },
    }));
    return request;
  },

  verifyRequest: async (requestId: string, code: string, verifiedBy?: string) => {
    const req = get().data.requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    const expected = req.verificationCode || 'DEMO-7824';
    const isMatch = code.trim().toUpperCase() === expected.trim().toUpperCase();

    if (isMatch) {
      const event: DomainEvent = {
        type: 'VerificationSucceeded',
        payload: {
          requestId,
          verifiedBy: verifiedBy || 'Hospital Medical Officer',
        },
        timestamp: get().clock.currentIso,
      };
      get().dispatchDomainEvent(event);

      // Automatically trigger initial matching
      get().escalateRequest(requestId);
      return { success: true };
    } else {
      const event: DomainEvent = {
        type: 'VerificationFailed',
        payload: {
          requestId,
          attempts: (req.verificationAttempts || 0) + 1,
        },
        timestamp: get().clock.currentIso,
      };
      get().dispatchDomainEvent(event);
      return { success: false, error: 'Invalid verification code' };
    }
  },

  escalateRequest: (requestId: string) => {
    const state = get().data;
    const request = state.requests.find((r) => r.id === requestId);
    if (!request || request.verificationStatus !== 'verified') return;

    const hospital = state.hospitals.find((h) => h.id === request.hospitalId);
    if (!hospital) return;

    const currentIso = get().clock.currentIso;
    const selection = selectEscalationDonors(
      request,
      hospital,
      state.donors,
      state.bloodBanks,
      currentIso
    );

    if (selection.selectedDonors.length === 0) return;

    const newNotifications: Notification[] = selection.selectedDonors.map((scored, i) => ({
      id: `notif-${request.id}-${selection.tier}-${scored.donor.id}-${Date.now()}-${i}`,
      requestId: request.id,
      donorId: scored.donor.id,
      tier: selection.tier === 'rare' ? 'rare' : (selection.tier as 1 | 2 | 3),
      sentAt: currentIso,
      status: 'sent',
    }));

    const event: DomainEvent = {
      type: 'TierNotified',
      payload: {
        requestId,
        tier: selection.tier,
        donorIds: selection.selectedDonors.map((s) => s.donor.id),
        notifications: newNotifications,
      },
      timestamp: currentIso,
    };

    get().dispatchDomainEvent(event);
  },

  donorAccept: async (requestId: string, donorId: string, notificationId: string) => {
    const currentIso = get().clock.currentIso;
    const acceptEvent: DomainEvent = {
      type: 'DonorAccepted',
      payload: { requestId, donorId, notificationId },
      timestamp: currentIso,
    };
    get().dispatchDomainEvent(acceptEvent);

    const req = get().data.requests.find((r) => r.id === requestId);
    if (req && req.fulfilledUnits < req.units) {
      const newFulfilled = req.fulfilledUnits + 1;
      const fulfillEvent: DomainEvent = {
        type: 'UnitsFulfilled',
        payload: {
          requestId,
          unitsFulfilled: newFulfilled,
          donationEvent: {
            id: `donation-${Date.now()}`,
            requestId,
            donorId,
            units: 1,
            timestamp: currentIso,
          },
        },
        timestamp: currentIso,
      };
      get().dispatchDomainEvent(fulfillEvent);
    }
  },

  donorDecline: async (requestId: string, donorId: string, notificationId: string, reason?: string) => {
    const currentIso = get().clock.currentIso;
    const event: DomainEvent = {
      type: 'DonorDeclined',
      payload: { requestId, donorId, notificationId, reason },
      timestamp: currentIso,
    };
    get().dispatchDomainEvent(event);
  },

  revealDonorContact: async (requestId: string, donorId: string) => {
    const req = get().data.requests.find((r) => r.id === requestId);
    if (!req) return null;

    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, donorId, actor: 'Verified Hospital Coordinator' }),
      });
      const json = await res.json();
      if (json.success && json.phone) {
        if (json.auditEntry) {
          const auditEvent: DomainEvent = {
            type: 'ContactRevealed',
            payload: { requestId, donorId, auditEntry: json.auditEntry },
            timestamp: get().clock.currentIso,
          };
          get().dispatchDomainEvent(auditEvent);
        }
        return json.phone;
      }
      return null;
    } catch {
      // Local fallback for offline mode
      const donor = get().data.donors.find((d: Donor) => d.id === donorId);
      if (!donor) return null;
      const phoneDigits = donor.maskedPhone.slice(-2);
      const fallbackPhone = `+91 00000 482${phoneDigits}`;
      const auditEntry: AuditEntry = {
        id: `audit-offline-${Date.now()}`,
        actor: 'Verified Requester (Offline)',
        action: 'DONOR_CONTACT_REVEALED',
        requestId,
        donorId,
        timestamp: get().clock.currentIso,
      };
      const auditEvent: DomainEvent = {
        type: 'ContactRevealed',
        payload: { requestId, donorId, auditEntry },
        timestamp: get().clock.currentIso,
      };
      get().dispatchDomainEvent(auditEvent);
      return fallbackPhone;
    }
  },

  scheduleCamp: async (camp: ScheduledCamp) => {
    set((state) => ({
      data: {
        ...state.data,
        scheduledCamps: [...state.data.scheduledCamps, camp],
      },
    }));

    if (typeof window !== 'undefined') {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(get().data),
      }).catch(() => {});
    }
  },

  advanceClock: (minutes: number) => {
    const currentMs = Date.parse(get().clock.currentIso);
    const newMs = currentMs + minutes * 60 * 1000;
    const newIso = new Date(newMs).toISOString();

    set((state) => ({
      clock: { ...state.clock, currentIso: newIso },
    }));

    // Step auto-simulated responses if enabled
    if (get().autoSimulateResponses) {
      const step = stepSimulatedResponses(get().data, newIso);
      if (step.emittedEvents.length > 0) {
        set({ data: step.nextState });
      }
    }
  },

  setClockSpeed: (speed: 1 | 5 | 20) => {
    set((state) => ({ clock: { ...state.clock, speed } }));
  },

  toggleClockPause: () => {
    set((state) => ({
      clock: { ...state.clock, isPaused: !state.clock.isPaused },
    }));
  },

  setAutoSimulate: (enabled: boolean) => {
    set({ autoSimulateResponses: enabled });
  },

  setSelectedBloodGroup: (group: 'ALL' | BloodGroup) => {
    set((state) => ({ ui: { ...state.ui, selectedBloodGroup: group } }));
  },

  setActiveView: (view: ActiveView) => {
    set((state) => ({ ui: { ...state.ui, activeView: view } }));
  },

  setActiveRequestId: (id: string | null) => {
    set((state) => ({ ui: { ...state.ui, activeRequestId: id } }));
  },

  togglePresenterMode: () => {
    set((state) => ({
      ui: { ...state.ui, isPresenterMode: !state.ui.isPresenterMode },
    }));
  },

  setNotificationMessage: (msg: string | null) => {
    set((state) => ({ ui: { ...state.ui, notificationMessage: msg } }));
  },
}));
