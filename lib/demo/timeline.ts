import { AppDataStore, BloodRequest, Notification, DonationEvent, AuditEntry } from '../../types';
import { ActiveView } from '../../store/useAppStore';

export interface DemoChapter {
  id: number;
  title: string;
  subtitle: string;
  view: ActiveView;
  simulatedTimeIso: string;
  description: string;
  badge: string;
  applyState: (baseState: AppDataStore) => AppDataStore;
}

export const DEMO_REQUEST_ID = 'demo-req-rubyhall-01';

export function buildDemoTimeline(seedState: AppDataStore): DemoChapter[] {
  const rubyHall =
    seedState.hospitals.find((h) => h.name.includes('Ruby Hall')) || seedState.hospitals[0];

  const tier1DonorIds = ['donor-007', 'donor-008', 'donor-009', 'donor-010', 'donor-011'];
  const tier2DonorIds = [
    'donor-017', 'donor-018', 'donor-019', 'donor-020', 'donor-021',
    'donor-022', 'donor-023', 'donor-024', 'donor-025', 'donor-026',
  ];

  const acceptingDonorId = 'donor-007';

  return [
    // SCENE 1 — THE PROBLEM
    {
      id: 1,
      title: 'Scene 1: The Problem — Viral Forward Chaos',
      subtitle: 'Unfiltered WhatsApp broadcast reaches 500+ irrelevant people',
      view: 'impact',
      simulatedTimeIso: '2026-11-21T12:00:00.000Z',
      badge: 'PROBLEM',
      description:
        'A critical B+ blood request spreads across hundreds of family, alumni, and community WhatsApp groups. It circulates indiscriminately, leaks the attendant phone number publicly, and continues circulating for weeks as a stale forward.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        return next;
      },
    },

    // SCENE 2 — THE REQUEST
    {
      id: 2,
      title: 'Scene 2: The Verified Request',
      subtitle: 'Critical B+ need created at Ruby Hall Clinic',
      view: 'map',
      simulatedTimeIso: '2026-11-21T12:02:00.000Z',
      badge: 'VERIFICATION',
      description:
        'Requester creates a verified urgent request for 2 units of B+ red cells at Ruby Hall Clinic. Two-factor hospital confirmation code RUB-7824 verifies clinical legitimacy before any donor notification can fire.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        const demoReq: BloodRequest = {
          id: DEMO_REQUEST_ID,
          bloodGroup: 'B+',
          units: 2,
          hospitalId: rubyHall.id,
          urgency: 'critical',
          createdAt: '2026-11-21T12:02:00.000Z',
          expiresAt: '2026-11-21T16:02:00.000Z',
          status: 'matching',
          verifiedBy: 'Dr. A. K. Joshi (Chief Medical Officer)',
          verificationStatus: 'verified',
          tier: 0,
          acceptedDonorIds: [],
          notifiedDonorIds: [],
          fulfilledUnits: 0,
          requester: {
            name: 'Pooja Deshmukh',
            phone: '+91 98220 12345',
            hospitalPatientId: 'RHC-2026-9812',
          },
          verificationCode: 'RUB-7824',
        };
        next.requests = [demoReq, ...next.requests.filter((r) => r.id !== DEMO_REQUEST_ID)];
        return next;
      },
    },

    // SCENE 3 — INTELLIGENT MATCHING
    {
      id: 3,
      title: 'Scene 3: Intelligent Matching — Tier 1 Activated',
      subtitle: 'Top 5 eligible donors within 5 km notified',
      view: 'map',
      simulatedTimeIso: '2026-11-21T12:03:00.000Z',
      badge: 'TIER 1 MATCH',
      description:
        'The matching engine queries 300 registered donors across Pune. It filters 220 compatible and cooling-off eligible donors, ranks them using Haversine proximity + reliability scores, and precision-notifies the top 5 donors within 5 km.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        let req = next.requests.find((r) => r.id === DEMO_REQUEST_ID);
        if (!req) {
          // If jumped directly, ensure request exists
          next.requests.push({
            id: DEMO_REQUEST_ID,
            bloodGroup: 'B+',
            units: 2,
            hospitalId: rubyHall.id,
            urgency: 'critical',
            createdAt: '2026-11-21T12:02:00.000Z',
            expiresAt: '2026-11-21T16:02:00.000Z',
            status: 'matching',
            verifiedBy: 'Dr. A. K. Joshi',
            verificationStatus: 'verified',
            tier: 1,
            acceptedDonorIds: [],
            notifiedDonorIds: [...tier1DonorIds],
            fulfilledUnits: 0,
            requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'RHC-2026-9812' },
          });
        } else {
          req.tier = 1;
          req.notifiedDonorIds = [...tier1DonorIds];
        }

        const notifs: Notification[] = tier1DonorIds.map((did) => ({
          id: `notif-demo-t1-${did}`,
          requestId: DEMO_REQUEST_ID,
          donorId: did,
          tier: 1,
          sentAt: '2026-11-21T12:03:00.000Z',
          status: 'sent',
        }));
        next.notifications = [...notifs, ...next.notifications.filter((n) => n.requestId !== DEMO_REQUEST_ID)];
        return next;
      },
    },

    // SCENE 4 — ESCALATION
    {
      id: 4,
      title: 'Scene 4: Controlled Escalation — Tier 2 Widening',
      subtitle: '10 simulated minutes elapsed · Radius widens to 10 km',
      view: 'map',
      simulatedTimeIso: '2026-11-21T12:13:00.000Z',
      badge: 'TIER 2 ESCALATION',
      description:
        'No acceptance received after 10 simulated minutes. The escalation engine automatically widens the geographic radius to 10 km, contacting the next 10 unnotified donors while preventing double-notification.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        let req = next.requests.find((r) => r.id === DEMO_REQUEST_ID);
        if (!req) {
          req = {
            id: DEMO_REQUEST_ID,
            bloodGroup: 'B+',
            units: 2,
            hospitalId: rubyHall.id,
            urgency: 'critical',
            createdAt: '2026-11-21T12:02:00.000Z',
            expiresAt: '2026-11-21T16:02:00.000Z',
            status: 'matching',
            verifiedBy: 'Dr. A. K. Joshi',
            verificationStatus: 'verified',
            tier: 2,
            acceptedDonorIds: [],
            notifiedDonorIds: [...tier1DonorIds, ...tier2DonorIds],
            fulfilledUnits: 0,
            requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'RHC-2026-9812' },
          };
          next.requests.push(req);
        } else {
          req.tier = 2;
          req.notifiedDonorIds = [...tier1DonorIds, ...tier2DonorIds];
        }

        const t2Notifs: Notification[] = tier2DonorIds.map((did) => ({
          id: `notif-demo-t2-${did}`,
          requestId: DEMO_REQUEST_ID,
          donorId: did,
          tier: 2,
          sentAt: '2026-11-21T12:13:00.000Z',
          status: 'sent',
        }));
        next.notifications = [...next.notifications, ...t2Notifs];
        return next;
      },
    },

    // SCENE 5 — DONOR ACCEPTANCE
    {
      id: 5,
      title: 'Scene 5: Donor Acceptance & Contact Reveal',
      subtitle: 'Self-check cleared · Contact revealed to hospital with audit log',
      view: 'donor',
      simulatedTimeIso: '2026-11-21T12:16:00.000Z',
      badge: 'ACCEPTANCE',
      description:
        'Nearby donor Vihaan Joshi (+91 XXXXX XX482) receives the simulated alert, passes the 4-point transient eligibility self-check, and taps Accept. His contact (+91 00000 48219) is securely revealed exclusively to the treating hospital coordinator.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        let req = next.requests.find((r) => r.id === DEMO_REQUEST_ID);
        if (!req) {
          req = {
            id: DEMO_REQUEST_ID,
            bloodGroup: 'B+',
            units: 2,
            hospitalId: rubyHall.id,
            urgency: 'critical',
            createdAt: '2026-11-21T12:02:00.000Z',
            expiresAt: '2026-11-21T16:02:00.000Z',
            status: 'matching',
            verifiedBy: 'Dr. A. K. Joshi',
            verificationStatus: 'verified',
            tier: 2,
            acceptedDonorIds: [acceptingDonorId],
            notifiedDonorIds: [...tier1DonorIds, ...tier2DonorIds],
            fulfilledUnits: 1,
            requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'RHC-2026-9812' },
          };
          next.requests.push(req);
        } else {
          req.acceptedDonorIds = [acceptingDonorId];
          req.fulfilledUnits = 1;
        }

        const notif = next.notifications.find((n) => n.donorId === acceptingDonorId && n.requestId === DEMO_REQUEST_ID);
        if (notif) {
          notif.status = 'accepted';
          notif.responseAt = '2026-11-21T12:16:00.000Z';
        }

        const auditEntry: AuditEntry = {
          id: 'audit-demo-reveal-01',
          actor: 'Dr. A. K. Joshi (Ruby Hall Clinic)',
          action: 'DONOR_CONTACT_REVEALED',
          requestId: DEMO_REQUEST_ID,
          donorId: acceptingDonorId,
          timestamp: '2026-11-21T12:16:00.000Z',
          metadata: { donorMasked: '+91 XXXXX XX482', hospital: 'Ruby Hall Clinic' },
        };
        next.auditLogs = [auditEntry, ...next.auditLogs.filter((a) => a.id !== auditEntry.id)];
        return next;
      },
    },

    // SCENE 6 — CLOSURE
    {
      id: 6,
      title: 'Scene 6: Request Fulfilment & Automatic Closure',
      subtitle: '2 of 2 units fulfilled · Old WhatsApp forward stamped STALE',
      view: 'map',
      simulatedTimeIso: '2026-11-21T12:22:00.000Z',
      badge: 'FULFILLED & CLOSED',
      description:
        'Second compatible donor arrives and donates. All 2 required units are fulfilled. The request is immediately closed, active notifications are terminated, and any external reference is permanently stamped STALE.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        let req = next.requests.find((r) => r.id === DEMO_REQUEST_ID);
        if (!req) {
          req = {
            id: DEMO_REQUEST_ID,
            bloodGroup: 'B+',
            units: 2,
            hospitalId: rubyHall.id,
            urgency: 'critical',
            createdAt: '2026-11-21T12:02:00.000Z',
            expiresAt: '2026-11-21T16:02:00.000Z',
            status: 'fulfilled',
            verifiedBy: 'Dr. A. K. Joshi',
            verificationStatus: 'verified',
            tier: 2,
            acceptedDonorIds: [acceptingDonorId, 'donor-018'],
            notifiedDonorIds: [...tier1DonorIds, ...tier2DonorIds],
            fulfilledUnits: 2,
            requester: { name: 'Pooja', phone: '+91 98220 12345', hospitalPatientId: 'RHC-2026-9812' },
          };
          next.requests.push(req);
        } else {
          req.status = 'fulfilled';
          req.fulfilledUnits = 2;
          req.acceptedDonorIds = [acceptingDonorId, 'donor-018'];
        }

        const event1: DonationEvent = {
          id: 'donation-demo-01',
          requestId: DEMO_REQUEST_ID,
          donorId: acceptingDonorId,
          units: 1,
          timestamp: '2026-11-21T12:16:00.000Z',
        };
        const event2: DonationEvent = {
          id: 'donation-demo-02',
          requestId: DEMO_REQUEST_ID,
          donorId: 'donor-018',
          units: 1,
          timestamp: '2026-11-21T12:22:00.000Z',
        };
        next.donationEvents = [event1, event2, ...next.donationEvents.filter((d) => !d.id.startsWith('donation-demo'))];
        return next;
      },
    },

    // SCENE 7 — INTELLIGENCE
    {
      id: 7,
      title: 'Scene 7: Strategic Intelligence — Blood Desert & Forecasting',
      subtitle: 'Predicting summer shortages and dispatching campus drives',
      view: 'heatmap',
      simulatedTimeIso: '2026-11-21T12:24:00.000Z',
      badge: 'STRATEGIC AI',
      description:
        'RaktSetu continuously converts historical emergency patterns into actionable insights: mapping underserved blood desert localities and scheduling collegiate donor drives before lean summer months.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        return next;
      },
    },

    // SCENE 8 — FINAL IMPACT
    {
      id: 8,
      title: 'Scene 8: The Final Impact — 500 vs 5',
      subtitle: 'Surgical speed · Zero spam · Uncompromised donor privacy',
      view: 'impact',
      simulatedTimeIso: '2026-11-21T12:25:00.000Z',
      badge: 'FINAL IMPACT',
      description:
        'In 23 simulated minutes, RaktSetu matched and fulfilled 2 critical units of blood with only 15 precision contacts, avoiding over 495 unnecessary WhatsApp spam forwards while maintaining complete donor privacy.',
      applyState: (state) => {
        const next: AppDataStore = JSON.parse(JSON.stringify(state));
        const req = next.requests.find((r) => r.id === DEMO_REQUEST_ID);
        if (req) {
          req.status = 'fulfilled';
          req.fulfilledUnits = 2;
        }
        return next;
      },
    },
  ];
}

/**
 * Replays demo timeline from scene 0 through chapterIndex.
 * Guarantees recovery and clean deterministic state after any misclick.
 */
export function replayDemoUpToChapter(seed: AppDataStore, chapterIndex: number): AppDataStore {
  const chapters = buildDemoTimeline(seed);
  let state = JSON.parse(JSON.stringify(seed));
  for (let i = 0; i <= chapterIndex && i < chapters.length; i++) {
    state = chapters[i].applyState(state);
  }
  return state;
}
