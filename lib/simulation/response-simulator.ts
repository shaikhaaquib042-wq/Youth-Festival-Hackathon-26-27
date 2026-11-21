import {
  AppDataStore,
  DomainEvent,
  Notification,
  Donor,
  BloodRequest,
} from '../../types';
import { createMulberry32 } from '../prng';

export interface SimulatedStepResult {
  nextState: AppDataStore;
  emittedEvents: DomainEvent[];
}

/**
 * Pure simulator step driven by the simulated clock.
 * Checks for notified donors whose response delay has passed.
 * Applies acceptance with probability = donor.responseRate.
 */
export function stepSimulatedResponses(
  state: AppDataStore,
  currentIsoTime: string,
  randomSeed: number = 42
): SimulatedStepResult {
  const currentMs = Date.parse(currentIsoTime);
  const emittedEvents: DomainEvent[] = [];
  const next: AppDataStore = JSON.parse(JSON.stringify(state));

  // Find notifications still in 'sent' status
  const pendingNotifications = next.notifications.filter((n: Notification) => n.status === 'sent');

  if (pendingNotifications.length === 0) {
    return { nextState: next, emittedEvents };
  }

  const rng = createMulberry32(randomSeed + Math.floor(currentMs / 1000));

  for (const notif of pendingNotifications) {
    const request = next.requests.find((r: BloodRequest) => r.id === notif.requestId);
    if (!request || request.status !== 'matching') {
      continue;
    }

    const donor = next.donors.find((d: Donor) => d.id === notif.donorId);
    if (!donor) continue;

    const sentMs = Date.parse(notif.sentAt);
    const elapsedMinutes = (currentMs - sentMs) / (60 * 1000);

    // Each donor responds after a delay of 2 to 6 simulated minutes
    const simulatedResponseDelayMinutes = 2 + (1.0 - donor.responseRate) * 4;

    if (elapsedMinutes >= simulatedResponseDelayMinutes) {
      // Deterministic decision based on responseRate
      const willAccept = rng.next() < donor.responseRate;

      if (willAccept) {
        // Emit DonorAccepted
        const acceptEvent: DomainEvent = {
          type: 'DonorAccepted',
          payload: {
            requestId: request.id,
            donorId: donor.id,
            notificationId: notif.id,
          },
          timestamp: currentIsoTime,
        };
        emittedEvents.push(acceptEvent);

        notif.status = 'accepted';
        notif.responseAt = currentIsoTime;
        if (!request.acceptedDonorIds.includes(donor.id)) {
          request.acceptedDonorIds.push(donor.id);
        }

        // Check if this fulfills units
        if (request.fulfilledUnits < request.units) {
          const newFulfilledUnits = request.fulfilledUnits + 1;
          const donationEvent = {
            id: `donation-${Date.now()}-${rng.nextInt(100, 999)}`,
            requestId: request.id,
            donorId: donor.id,
            units: 1,
            timestamp: currentIsoTime,
          };

          const fulfillEvent: DomainEvent = {
            type: 'UnitsFulfilled',
            payload: {
              requestId: request.id,
              unitsFulfilled: newFulfilledUnits,
              donationEvent,
            },
            timestamp: currentIsoTime,
          };
          emittedEvents.push(fulfillEvent);

          request.fulfilledUnits = newFulfilledUnits;
          next.donationEvents.push(donationEvent);

          if (request.fulfilledUnits >= request.units) {
            request.status = 'fulfilled';
          }
        }
      } else {
        // Emit DonorDeclined
        const declineEvent: DomainEvent = {
          type: 'DonorDeclined',
          payload: {
            requestId: request.id,
            donorId: donor.id,
            notificationId: notif.id,
            reason: 'Unavailable for scheduled window',
          },
          timestamp: currentIsoTime,
        };
        emittedEvents.push(declineEvent);

        notif.status = 'declined';
        notif.responseAt = currentIsoTime;
        notif.declineReason = 'Unavailable for scheduled window';
      }
    }
  }

  return { nextState: next, emittedEvents };
}
