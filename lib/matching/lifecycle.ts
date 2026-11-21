import {
  BloodRequest,
  DomainEvent,
  AppDataStore,
  Notification,
} from '../../types';
import { CONFIG } from '../config';

export interface RevealAuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Pure authorization check for contact reveal.
 * SPEC §7:
 * "Only after a donor accepts is the contact revealed to the verified requester of that request.
 * Reveal authorization is a pure function (denied if unverified, not accepted, request closed, or wrong request)."
 */
export function canRevealContact(
  request: BloodRequest,
  donorId: string
): RevealAuthorizationResult {
  if (request.verificationStatus !== 'verified') {
    return {
      authorized: false,
      reason: 'Denied: Blood request is not verified.',
    };
  }

  if (request.status === 'rejected' || request.status === 'cancelled') {
    return {
      authorized: false,
      reason: `Denied: Request is ${request.status}.`,
    };
  }

  if (!request.acceptedDonorIds || !request.acceptedDonorIds.includes(donorId)) {
    return {
      authorized: false,
      reason: 'Denied: Donor has not accepted this request.',
    };
  }

  return { authorized: true };
}

/**
 * Checks if a request has passed its expiration time.
 */
export function isRequestExpired(request: BloodRequest, currentIsoTime: string): boolean {
  if (request.status === 'fulfilled' || request.status === 'expired' || request.status === 'cancelled') {
    return true;
  }
  const currentMs = Date.parse(currentIsoTime);
  const expiryMs = Date.parse(request.expiresAt);
  return currentMs >= expiryMs;
}

/**
 * Checks if 24 simulated hours have passed since request closure to trigger PII purging.
 */
export function isPiiPurgeDue(
  closureIsoTime: string,
  currentIsoTime: string
): boolean {
  const closedMs = Date.parse(closureIsoTime);
  const currentMs = Date.parse(currentIsoTime);
  const hoursSinceClosure = (currentMs - closedMs) / (3600 * 1000);
  return hoursSinceClosure >= CONFIG.EXPIRY.PII_PURGE_HOURS;
}

/**
 * Pure Event-Sourcing Reducer: folds domain events to produce updated application state.
 * SPEC §3: "State = fold of events. The audit log, demo scrubbing, previous-step, reset and recovery all fall out of this."
 */
export function reduceDomainEvent(
  state: AppDataStore,
  event: DomainEvent
): AppDataStore {
  const next: AppDataStore = JSON.parse(JSON.stringify(state));

  switch (event.type) {
    case 'RequestCreated': {
      next.requests.push(event.payload);
      break;
    }

    case 'VerificationSucceeded': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req) {
        req.verificationStatus = 'verified';
        req.verifiedBy = event.payload.verifiedBy;
        req.status = 'matching';
      }
      break;
    }

    case 'VerificationFailed': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req) {
        req.verificationAttempts = (req.verificationAttempts || 0) + 1;
        if (req.verificationAttempts >= 3) {
          req.verificationStatus = 'failed';
          req.status = 'rejected';
        }
      }
      break;
    }

    case 'TierNotified': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req) {
        req.tier = event.payload.tier;
        req.notifiedDonorIds = Array.from(
          new Set([...req.notifiedDonorIds, ...event.payload.donorIds])
        );
      }
      next.notifications.push(...event.payload.notifications);
      break;
    }

    case 'DonorAccepted': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req && !req.acceptedDonorIds.includes(event.payload.donorId)) {
        req.acceptedDonorIds.push(event.payload.donorId);
      }
      const notif = next.notifications.find((n: Notification) => n.id === event.payload.notificationId);
      if (notif) {
        notif.status = 'accepted';
        notif.responseAt = event.timestamp;
      }
      break;
    }

    case 'DonorDeclined': {
      const notif = next.notifications.find((n: Notification) => n.id === event.payload.notificationId);
      if (notif) {
        notif.status = 'declined';
        notif.responseAt = event.timestamp;
        notif.declineReason = event.payload.reason;
      }
      break;
    }

    case 'UnitsFulfilled': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req) {
        req.fulfilledUnits = event.payload.unitsFulfilled;
        if (req.fulfilledUnits >= req.units) {
          req.status = 'fulfilled';
        }
      }
      next.donationEvents.push(event.payload.donationEvent);
      break;
    }

    case 'RequestExpired': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req && req.status !== 'fulfilled') {
        req.status = 'expired';
      }
      break;
    }

    case 'RequestCancelled': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req) {
        req.status = 'cancelled';
      }
      break;
    }

    case 'ContactRevealed': {
      next.auditLogs.push(event.payload.auditEntry);
      break;
    }

    case 'PiiPurged': {
      const req = next.requests.find((r: BloodRequest) => r.id === event.payload.requestId);
      if (req) {
        req.requester = null;
      }
      break;
    }
  }

  return next;
}
