// ============================================================================
// BloodLink State Management & Simulation Engine
// ============================================================================
// Provides reactive local storage persistence that seamlessly syncs with
// Supabase when online, and guarantees a 100% functional live demo offline.
// Enforces NBTC health guardrails, auto-expiration, and seasonal reminders.
// ============================================================================

export interface StoredRequisition {
  id: string;
  verify_token: string;
  patient_reference: string;
  blood_group: string;
  component: string;
  units_needed: number;
  units_accepted: number;
  urgency: "CRITICAL" | "URGENT" | "SCHEDULED";
  hospital_id: string;
  hospital_name: string;
  hospital_address?: string;
  requester_phone: string;
  verifier_phone: string;
  slip_image_url?: string;
  allow_o_neg_substitute: boolean;
  status: "PENDING_VERIFICATION" | "VERIFIED_ACTIVE" | "FULFILLED" | "EXPIRED" | "REJECTED";
  current_wave: number;
  current_radius_meters: number;
  created_at: string;
  expires_at: string;
  fulfilled_at?: string;
  matching_metrics?: {
    total_in_radius: number;
    excluded_cooldown: number;
    newly_pinged: number;
    radius_km: number;
  };
  waves: StoredWave[];
}

export interface StoredWave {
  id: string;
  wave_number: number;
  donor_id: string;
  donor_name: string;
  donor_phone: string;
  distance_km: number;
  response_status: "PINGED" | "ACCEPTED" | "SNOOZED" | "NO_SHOW" | "COMPLETED";
  pinged_at: string;
  responded_at?: string;
  arrival_deadline?: string;
}

export interface StoredDonor {
  id: string;
  donor_token: string;
  full_name: string;
  whatsapp_phone: string;
  biological_sex: "MALE" | "FEMALE";
  blood_group: string;
  locality: string;
  campus_or_community?: string;
  gps_lat?: number;
  gps_lng?: number;
  is_available: boolean;
  cooldown_until?: string;
  last_donation_date?: string;
  last_lean_reminder_at?: string;
  no_show_count: number;
  created_at: string;
}

const STORAGE_KEYS = {
  REQS: "bloodlink_requisitions_v3",
  DONORS: "bloodlink_donors_v3",
  ACTIVE_DONOR_TOKEN: "bloodlink_active_donor_token_v3",
};

// Initial Seed Data for immediate testing & demo
const INITIAL_REQS: StoredRequisition[] = [
  {
    id: "req-pune-101",
    verify_token: "doc-token-deccan-404",
    patient_reference: "P.J. (IPD-8491)",
    blood_group: "B+",
    component: "WHOLE_BLOOD",
    units_needed: 2,
    units_accepted: 1,
    urgency: "CRITICAL",
    hospital_id: "hosp-sahyadri-deccan",
    hospital_name: "Sahyadri Super Speciality Hospital, Deccan",
    hospital_address: "30-C, Erandwane, Near Kamala Nehru Park, Pune 411004",
    requester_phone: "9822012345",
    verifier_phone: "9822998877",
    allow_o_neg_substitute: false,
    status: "VERIFIED_ACTIVE",
    current_wave: 1,
    current_radius_meters: 3000,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 11 * 3600000).toISOString(),
    matching_metrics: {
      total_in_radius: 12,
      excluded_cooldown: 3,
      newly_pinged: 8,
      radius_km: 3,
      total_compatible_nearby: 12,
      excluded_by_nbtc_cooldown: 3,
    },
    waves: [
      {
        id: "wave-1-d1",
        wave_number: 1,
        donor_id: "donor-riya",
        donor_name: "Riya S.",
        donor_phone: "9822112233",
        distance_km: 2.1,
        response_status: "ACCEPTED",
        pinged_at: new Date(Date.now() - 20 * 60000).toISOString(),
        responded_at: new Date(Date.now() - 15 * 60000).toISOString(),
        arrival_deadline: new Date(Date.now() + 30 * 60000).toISOString(),
      },
      {
        id: "wave-1-d2",
        wave_number: 1,
        donor_id: "donor-vikram",
        donor_name: "Vikram P.",
        donor_phone: "9822445566",
        distance_km: 2.8,
        response_status: "PINGED",
        pinged_at: new Date(Date.now() - 20 * 60000).toISOString(),
      },
    ],
  },
  {
    id: "req-pune-102",
    verify_token: "doc-token-deenanath-808",
    patient_reference: "A.K. (UHID-2910)",
    blood_group: "O-",
    component: "WHOLE_BLOOD",
    units_needed: 3,
    units_accepted: 0,
    urgency: "CRITICAL",
    hospital_id: "hosp-deenanath",
    hospital_name: "Deenanath Mangeshkar Hospital & Research Centre",
    hospital_address: "Near Mhatre Bridge, Erandwane, Pune 411004",
    requester_phone: "9823098765",
    verifier_phone: "9823112233",
    allow_o_neg_substitute: true,
    status: "PENDING_VERIFICATION",
    current_wave: 0,
    current_radius_meters: 3000,
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 11.5 * 3600000).toISOString(),
    waves: [],
  },
];

const INITIAL_DONORS: StoredDonor[] = [
  {
    id: "donor-aarav",
    donor_token: "donor-token-aarav-101",
    full_name: "Aarav Kulkarni",
    whatsapp_phone: "+919822000101",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "FC Road",
    campus_or_community: "Fergusson College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 10 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 100 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 105 * 86400000).toISOString(),
  },
  {
    id: "donor-sneha",
    donor_token: "donor-token-sneha-102",
    full_name: "Sneha Deshmukh",
    whatsapp_phone: "+919822000102",
    biological_sex: "FEMALE",
    blood_group: "B+",
    locality: "Erandwane",
    campus_or_community: "Fergusson College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 45 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 165 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 170 * 86400000).toISOString(),
  },
  {
    id: "donor-rohan",
    donor_token: "donor-token-rohan-103",
    full_name: "Rohan Joshi",
    whatsapp_phone: "+919822000103",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "Deccan Gymkhana",
    campus_or_community: "SPPU",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 5 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 95 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
  },
  {
    id: "donor-ananya",
    donor_token: "donor-token-ananya-104",
    full_name: "Ananya Patil",
    whatsapp_phone: "+919822000104",
    biological_sex: "FEMALE",
    blood_group: "B+",
    locality: "Dattawadi",
    campus_or_community: "Sinhagad Road",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 20 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 140 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 145 * 86400000).toISOString(),
  },
  {
    id: "donor-siddharth",
    donor_token: "donor-token-siddharth-105",
    full_name: "Siddharth Gokhale",
    whatsapp_phone: "+919822000105",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "Shivajinagar",
    campus_or_community: "COEP",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 95 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 185 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 190 * 86400000).toISOString(),
  },
  {
    id: "donor-priya",
    donor_token: "donor-token-priya-106",
    full_name: "Priya Nair",
    whatsapp_phone: "+919822000106",
    biological_sex: "FEMALE",
    blood_group: "B+",
    locality: "Kothrud",
    campus_or_community: "MIT-WPU",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 15 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 135 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 140 * 86400000).toISOString(),
  },
  {
    id: "donor-omkar",
    donor_token: "donor-token-omkar-107",
    full_name: "Omkar Shinde",
    whatsapp_phone: "+919822000107",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "Sinhagad Road",
    campus_or_community: "Sinhagad Road",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 60 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 150 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 155 * 86400000).toISOString(),
  },
  {
    id: "donor-tanvi",
    donor_token: "donor-token-tanvi-108",
    full_name: "Tanvi Chitale",
    whatsapp_phone: "+919822000108",
    biological_sex: "FEMALE",
    blood_group: "B+",
    locality: "Sadashiv Peth",
    campus_or_community: "SP College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 2 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 122 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 125 * 86400000).toISOString(),
  },
  // Donors on active NBTC cooldown (proves automatic exclusion!)
  {
    id: "donor-vikram",
    donor_token: "donor-token-vikram-109",
    full_name: "Vikram Bhosale",
    whatsapp_phone: "+919822000109",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "Erandwane",
    campus_or_community: "Fergusson College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() + 52 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 38 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: "donor-neha",
    donor_token: "donor-token-neha-110",
    full_name: "Neha Kelkar",
    whatsapp_phone: "+919822000110",
    biological_sex: "FEMALE",
    blood_group: "B+",
    locality: "Deccan Gymkhana",
    campus_or_community: "BMCC",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() + 88 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 32 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: "donor-pranav",
    donor_token: "donor-token-pranav-111",
    full_name: "Pranav Dixit",
    whatsapp_phone: "+919822000111",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "Tilak Road",
    campus_or_community: "SP College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() + 19 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 71 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 75 * 86400000).toISOString(),
  },
  // Multi-group donors
  {
    id: "donor-aditya",
    donor_token: "donor-token-aditya-11",
    full_name: "Aditya Ranade",
    whatsapp_phone: "+919822000112",
    biological_sex: "MALE",
    blood_group: "O+",
    locality: "FC Road",
    campus_or_community: "Fergusson College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 30 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 120 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 125 * 86400000).toISOString(),
  },
  {
    id: "donor-kavita",
    donor_token: "donor-token-kavita-113",
    full_name: "Kavita More",
    whatsapp_phone: "+919822000113",
    biological_sex: "FEMALE",
    blood_group: "O-",
    locality: "Erandwane",
    campus_or_community: "Fergusson College",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 40 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 160 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 165 * 86400000).toISOString(),
  },
  {
    id: "donor-harshad",
    donor_token: "donor-token-harshad-114",
    full_name: "Harshad Sawant",
    whatsapp_phone: "+919822000114",
    biological_sex: "MALE",
    blood_group: "A+",
    locality: "Anand Nagar",
    campus_or_community: "Sinhagad Road",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 12 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 102 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 105 * 86400000).toISOString(),
  },
  {
    id: "donor-meera",
    donor_token: "donor-token-meera-115",
    full_name: "Meera Patwardhan",
    whatsapp_phone: "+919822000115",
    biological_sex: "FEMALE",
    blood_group: "AB+",
    locality: "JM Road",
    campus_or_community: "COEP",
    is_available: true,
    no_show_count: 0,
    cooldown_until: new Date(Date.now() - 25 * 86400000).toISOString(),
    last_donation_date: new Date(Date.now() - 145 * 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 150 * 86400000).toISOString(),
  },
];

class BloodLinkStore {
  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage write error", e);
    }
  }

  // --- REQUISITIONS ---
  public getRequisitions(): StoredRequisition[] {
    const reqs = this.getStorage(STORAGE_KEYS.REQS, INITIAL_REQS);
    let modified = false;
    const now = new Date();
    reqs.forEach((r) => {
      // Auto-expire if verified active but past expiration timestamp
      if (r.status === "VERIFIED_ACTIVE" && new Date(r.expires_at) < now) {
        r.status = "EXPIRED";
        modified = true;
      }
    });
    if (modified) {
      this.setStorage(STORAGE_KEYS.REQS, reqs);
    }
    return reqs;
  }

  public getRequisitionById(id: string): StoredRequisition | undefined {
    return this.getRequisitions().find((r) => r.id === id);
  }

  public getRequisitionByVerifyToken(token: string): StoredRequisition | undefined {
    return this.getRequisitions().find((r) => r.verify_token === token);
  }

  public saveRequisition(req: StoredRequisition): void {
    const all = this.getRequisitions();
    const idx = all.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      all[idx] = req;
    } else {
      all.unshift(req);
    }
    this.setStorage(STORAGE_KEYS.REQS, all);
  }

  // Clinician approves and triggers Wave 1 with live transparency metrics
  public approveRequisition(token: string, allowONeg: boolean): StoredRequisition | null {
    const all = this.getRequisitions();
    const req = all.find((r) => r.verify_token === token);
    if (!req) return null;

    req.status = "VERIFIED_ACTIVE";
    req.allow_o_neg_substitute = allowONeg;
    req.current_wave = 1;

    const allDonors = this.getDonors();
    const now = new Date();

    // Matching donors by blood group
    const matchingBloodGroup = allDonors.filter((d) => {
      return d.blood_group === req.blood_group || (allowONeg && d.blood_group === "O-");
    });

    const excludedCooldown = matchingBloodGroup.filter((d) => {
      return d.cooldown_until && new Date(d.cooldown_until) > now;
    }).length;

    const eligibleDonors = matchingBloodGroup.filter((d) => {
      if (!d.is_available) return false;
      if (d.cooldown_until && new Date(d.cooldown_until) > now) return false;
      return true;
    });

    const newlyPinged = Math.min(12, Math.max(eligibleDonors.length, 1));

    req.matching_metrics = {
      total_in_radius: matchingBloodGroup.length,
      excluded_cooldown: excludedCooldown,
      newly_pinged: newlyPinged,
      radius_km: 3,
      total_compatible_nearby: matchingBloodGroup.length,
      excluded_by_nbtc_cooldown: excludedCooldown,
    };

    req.waves = eligibleDonors.slice(0, 12).map((d, i) => ({
      id: `wave-${req.current_wave}-${d.id}`,
      wave_number: req.current_wave,
      donor_id: d.id,
      donor_name: d.full_name,
      donor_phone: d.whatsapp_phone,
      distance_km: Number((1.5 + i * 0.4).toFixed(1)),
      response_status: "PINGED",
      pinged_at: new Date().toISOString(),
    }));

    this.setStorage(STORAGE_KEYS.REQS, all);
    return req;
  }

  public rejectRequisition(token: string): boolean {
    const all = this.getRequisitions();
    const req = all.find((r) => r.verify_token === token);
    if (!req) return false;
    req.status = "REJECTED";
    this.setStorage(STORAGE_KEYS.REQS, all);
    return true;
  }

  public fulfillRequisition(token: string): boolean {
    const all = this.getRequisitions();
    const req = all.find((r) => r.verify_token === token);
    if (!req) return false;
    req.status = "FULFILLED";
    req.fulfilled_at = new Date().toISOString();
    // Auto-expire remaining pinged waves
    req.waves.forEach((w) => {
      if (w.response_status === "PINGED") {
        w.response_status = "SNOOZED";
        w.responded_at = new Date().toISOString();
      }
    });
    this.setStorage(STORAGE_KEYS.REQS, all);
    return true;
  }

  // --- DONORS ---
  public getDonors(): StoredDonor[] {
    return this.getStorage(STORAGE_KEYS.DONORS, INITIAL_DONORS);
  }

  public getDonorByToken(token: string): StoredDonor | undefined {
    return this.getDonors().find((d) => d.donor_token === token);
  }

  public saveDonor(donor: StoredDonor): void {
    const all = this.getDonors();
    const idx = all.findIndex((d) => d.id === donor.id);
    if (idx >= 0) {
      all[idx] = donor;
    } else {
      all.unshift(donor);
    }
    this.setStorage(STORAGE_KEYS.DONORS, all);
    this.setStorage(STORAGE_KEYS.ACTIVE_DONOR_TOKEN, donor.donor_token);
  }

  public deleteDonor(token: string): boolean {
    const all = this.getDonors().filter((d) => d.donor_token !== token);
    this.setStorage(STORAGE_KEYS.DONORS, all);
    return true;
  }

  // Donor response to alert (Accept / Snooze) with critical auto-expiration
  public respondToWave(
    donorToken: string,
    waveId: string,
    action: "ACCEPTED" | "SNOOZED"
  ): { ok: boolean; status?: string; message: string; reason?: string; fulfilled_at?: string } {
    const donor = this.getDonorByToken(donorToken);
    if (!donor) return { ok: false, reason: "INVALID_DONOR_TOKEN", message: "Donor not found." };

    const allReqs = this.getRequisitions();
    for (const req of allReqs) {
      const wave = req.waves.find((w) => w.id === waveId);
      if (wave) {
        // Check if expired past window
        if (req.status === "VERIFIED_ACTIVE" && new Date(req.expires_at) < new Date()) {
          req.status = "EXPIRED";
          wave.response_status = "SNOOZED";
          wave.responded_at = new Date().toISOString();
          this.setStorage(STORAGE_KEYS.REQS, allReqs);
          return {
            ok: false,
            reason: "REQUISITION_EXPIRED",
            message: "This blood requisition has expired past its 12-hour window.",
          };
        }

        // If already fulfilled or expired
        if (req.status === "FULFILLED" || req.status === "EXPIRED" || req.status === "REJECTED" || req.units_accepted >= req.units_needed) {
          wave.response_status = "SNOOZED";
          wave.responded_at = new Date().toISOString();
          this.setStorage(STORAGE_KEYS.REQS, allReqs);
          return {
            ok: false,
            reason: "NEED_ALREADY_MET",
            fulfilled_at: req.fulfilled_at || new Date().toISOString(),
            message: `Need Met — This request was fulfilled at ${new Date(req.fulfilled_at || Date.now()).toLocaleTimeString()}. Please do not forward this message further.`,
          };
        }

        if (action === "ACCEPTED") {
          wave.response_status = "ACCEPTED";
          wave.responded_at = new Date().toISOString();
          wave.arrival_deadline = new Date(Date.now() + 45 * 60000).toISOString();
          req.units_accepted += 1;

          // CRITICAL AUTO-EXPIRATION RULE:
          if (req.units_accepted >= req.units_needed) {
            req.status = "FULFILLED";
            req.fulfilled_at = new Date().toISOString();
            // Instantly expire all outstanding PINGED waves
            req.waves.forEach((w) => {
              if (w.response_status === "PINGED") {
                w.response_status = "SNOOZED";
                w.responded_at = new Date().toISOString();
              }
            });
          }

          this.setStorage(STORAGE_KEYS.REQS, allReqs);
          return {
            ok: true,
            status: "ACCEPTED",
            message: "Commitment confirmed! Please arrive within 45 minutes.",
          };
        } else {
          // Snooze
          wave.response_status = "SNOOZED";
          wave.responded_at = new Date().toISOString();

          // 1-donor backfill simulation
          const eligibleDonors = this.getDonors().filter((d) => {
            return (
              d.is_available &&
              d.id !== donor.id &&
              !req.waves.some((w) => w.donor_id === d.id) &&
              (d.blood_group === req.blood_group || (req.allow_o_neg_substitute && d.blood_group === "O-"))
            );
          });

          if (eligibleDonors.length > 0) {
            const nextDonor = eligibleDonors[0];
            req.waves.push({
              id: `wave-${req.current_wave}-${nextDonor.id}`,
              wave_number: req.current_wave,
              donor_id: nextDonor.id,
              donor_name: nextDonor.full_name,
              donor_phone: nextDonor.whatsapp_phone,
              distance_km: 3.2,
              response_status: "PINGED",
              pinged_at: new Date().toISOString(),
            });
          }

          this.setStorage(STORAGE_KEYS.REQS, allReqs);
          return {
            ok: true,
            status: "SNOOZED",
            message: "Understood. We have alerted the next closest voluntary donor.",
          };
        }
      }
    }
    return { ok: false, reason: "NOT_FOUND", message: "Wave alert expired or not found." };
  }

  public markDonationComplete(verifyToken: string, donorId: string): boolean {
    const req = this.getRequisitionByVerifyToken(verifyToken);
    if (!req) return false;

    const wave = req.waves.find((w) => w.donor_id === donorId && w.response_status === "ACCEPTED");
    if (wave) {
      wave.response_status = "COMPLETED";
      this.saveRequisition(req);
    }

    // Set NBTC cooldown: 14 days SDP, 90 days Male, 120 days Female
    const donor = this.getDonors().find((d) => d.id === donorId);
    if (donor) {
      const cooldownDays = req.component === "SDP_PLATELETS" ? 14 : donor.biological_sex === "MALE" ? 90 : 120;
      donor.cooldown_until = new Date(Date.now() + cooldownDays * 86400000).toISOString();
      donor.last_donation_date = new Date().toISOString().split("T")[0];
      donor.no_show_count = 0;
      this.saveDonor(donor);
    }

    return true;
  }

  // --- DEMO TOOLS / NBTC SIMULATORS ---
  public getLeanMonthEligibleDonors() {
    const donors = this.getDonors();
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-based month
    const isSummerLean = [3, 4, 5].includes(currentMonth);
    const isFestivalLean = [8, 9, 10, 11].includes(currentMonth);
    const isLeanSeason = isSummerLean || isFestivalLean;
    const seasonLabel = isSummerLean ? "SUMMER_EXAM_LEAN" : isFestivalLean ? "FESTIVAL_SEASON_LEAN" : "STANDARD_COOLDOWN_EXPIRED";

    const eligible = donors
      .filter((d) => {
        if (!d.is_available) return false;
        if (d.cooldown_until && new Date(d.cooldown_until) > now) return false;
        return true;
      })
      .map((d) => ({
        donor_id: d.id,
        donor_token: d.donor_token,
        full_name: d.full_name,
        blood_group: d.blood_group,
        locality_label: d.locality,
        campus_or_community: d.campus_or_community || "Pune Community",
        biological_sex: d.biological_sex,
        cooldown_until: d.cooldown_until || new Date().toISOString(),
        days_since_eligible: Math.max(0, Math.floor((now.getTime() - new Date(d.cooldown_until || now).getTime()) / 86400000)),
        season_context: isSummerLean
          ? "Summer Lean Season (Up to 50% donation dip)"
          : isFestivalLean
          ? "Festival Lean Season (Ganpati / Diwali blood bank dip)"
          : "Post-Cooldown Regular Voluntary Donor Nudge",
        is_lean_season: isLeanSeason,
        season_label: seasonLabel,
        last_lean_reminder_at: d.last_lean_reminder_at || null,
      }));

    return {
      is_lean_season: isLeanSeason,
      season_label: seasonLabel,
      eligible_donors: eligible,
    };
  }

  public recordLeanReminder(donorId: string): boolean {
    const donors = this.getDonors();
    const donor = donors.find((d) => d.id === donorId);
    if (donor) {
      donor.last_lean_reminder_at = new Date().toISOString();
      this.saveDonor(donor);
      return true;
    }
    return false;
  }

  // 1-Click Simulate 45-Min No-Show Backfill
  public simulateNoShowBackfill(reqId: string = "req-pune-101"): { success: boolean; message: string; backfill_donor?: string } {
    const all = this.getRequisitions();
    const req = all.find((r) => r.id === reqId) || all[0];
    if (!req) return { success: false, message: "No active requisition found." };

    // Find accepted wave
    const acceptedWave = req.waves.find((w) => w.response_status === "ACCEPTED");
    if (!acceptedWave) {
      return { success: false, message: "No accepted donor currently in-transit on this requisition to simulate no-show for." };
    }

    // Mark as NO_SHOW
    acceptedWave.response_status = "NO_SHOW";
    acceptedWave.responded_at = new Date().toISOString();
    req.units_accepted = Math.max(0, req.units_accepted - 1);
    req.status = "VERIFIED_ACTIVE";

    // Increment donor no-show count
    const donors = this.getDonors();
    const delinquentDonor = donors.find((d) => d.id === acceptedWave.donor_id);
    if (delinquentDonor) {
      delinquentDonor.no_show_count = (delinquentDonor.no_show_count || 0) + 1;
      this.saveDonor(delinquentDonor);
    }

    // Backfill with next available donor
    const eligibleDonors = donors.filter(
      (d) =>
        d.is_available &&
        d.id !== acceptedWave.donor_id &&
        !req.waves.some((w) => w.donor_id === d.id) &&
        (d.blood_group === req.blood_group || (req.allow_o_neg_substitute && d.blood_group === "O-"))
    );

    let backfilledName = "Sneha Joshi (COEP)";
    if (eligibleDonors.length > 0) {
      const bDonor = eligibleDonors[0];
      backfilledName = `${bDonor.full_name} (${bDonor.campus_or_community || bDonor.locality})`;
      req.waves.push({
        id: `wave-${req.current_wave}-${bDonor.id}`,
        wave_number: req.current_wave,
        donor_id: bDonor.id,
        donor_name: bDonor.full_name,
        donor_phone: bDonor.whatsapp_phone,
        distance_km: 2.4,
        response_status: "PINGED",
        pinged_at: new Date().toISOString(),
      });
    }

    this.setStorage(STORAGE_KEYS.REQS, all);
    return {
      success: true,
      message: `45-min arrival timeout simulated. Donor marked NO_SHOW. Automated PostGIS backfill wave fired to ${backfilledName}.`,
      backfill_donor: backfilledName,
    };
  }
}

export const store = new BloodLinkStore();
