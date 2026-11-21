import { BloodGroup } from '../types';

export const CONFIG = {
  // Donor cooling-off donation intervals (in days)
  // Verify against NBTC/official guidelines.
  DONATION_INTERVAL_DAYS_MALE: 90,
  // Verify against NBTC/official guidelines.
  DONATION_INTERVAL_DAYS_FEMALE: 120,

  // Distance decay for Haversine proximity score: proximity = exp(-d / LAMBDA_KM)
  LAMBDA_KM: 8.0,

  // Scoring weights (normalized sum = 1.0)
  WEIGHTS: {
    PROXIMITY: 0.45,
    EXACT_MATCH: 0.25,
    RELIABILITY: 0.20,
    RESPONSE_RATE: 0.10,
  },

  // Non-rare escalation tiers
  TIERS: {
    TIER_1: {
      RADIUS_KM: 5.0,
      MAX_DONORS: 5,
    },
    TIER_2: {
      TRIGGER_DELAY_MINUTES: 10,
      RADIUS_KM: 10.0,
      MAX_DONORS: 10,
    },
    TIER_3: {
      TRIGGER_DELAY_MINUTES: 15, // Additional minutes after Tier 2
      RADIUS_KM: 25.0,
      MAX_DONORS: 20,
      FLAG_BLOOD_BANKS: true,
    },
  },

  // Rare blood groups configuration
  RARE_GROUPS: ['AB-', 'B-', 'A-', 'O-'] as BloodGroup[],
  RARE_RADIUS_KM: 30.0,
  MAX_NOTIFICATIONS_RARE: 40,

  // Global notification caps per request
  MAX_NOTIFICATIONS_PER_REQUEST: 35,

  // WhatsApp broadcast comparison simulation model
  WHATSAPP_SIMULATION: {
    GROUPS_REACHED: 5,
    AVG_GROUP_SIZE: 120,
    OVERLAP_FACTOR: 0.15, // 15% overlap between groups
    // Derived formula: reach = GROUPS_REACHED * AVG_GROUP_SIZE * (1 - OVERLAP_FACTOR) => 510
  },

  // Expiry and privacy retention thresholds
  EXPIRY: {
    CRITICAL_HOURS: 4,
    URGENT_HOURS: 8,
    PLANNED_HOURS: 24,
    PII_PURGE_HOURS: 24, // 24 simulated hours after closure, requester PII is wiped
  },

  // Fixed anchor date for deterministic seed generation & simulated clock
  ANCHOR_DATE: '2026-11-21T12:00:00.000Z',

  // Pune geographic center
  PUNE_CENTER: {
    latitude: 18.5204,
    longitude: 73.8567,
    zoom: 12.2,
    pitch: 55,
    bearing: -15,
  },

  // Free Carto Dark Matter style URL (no API keys required)
  MAP_STYLE_URL: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const;
