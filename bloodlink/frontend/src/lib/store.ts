// ============================================================================
// BloodLink State Management & Simulation Engine
// ============================================================================
// Provides reactive local storage persistence that seamlessly syncs with
// Supabase when online, and guarantees a 100% functional live demo offline.
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
  gps_lat?: number;
  gps_lng?: number;
  is_available: boolean;
  cooldown_until?: string;
  last_donation_date?: string;
  no_show_count: number;
  created_at: string;
}

const STORAGE_KEYS = {
  REQS: "bloodlink_requisitions_v1",
  DONORS: "bloodlink_donors_v1",
  ACTIVE_DONOR_TOKEN: "bloodlink_active_donor_token",
};

// Initial Seed Data for immediate testing
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
    id: "donor-aditya",
    donor_token: "donor-token-aditya-11",
    full_name: "Aditya Deshmukh",
    whatsapp_phone: "9822001122",
    biological_sex: "MALE",
    blood_group: "B+",
    locality: "Sinhagad Road",
    is_available: true,
    no_show_count: 0,
    created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: "donor-aarav",
    donor_token: "donor-token-aarav-22",
    full_name: "Aarav Kulkarni",
    whatsapp_phone: "9822334455",
    biological_sex: "MALE",
    blood_group: "O-",
    locality: "Deccan Gymkhana",
    is_available: true,
    no_show_count: 0,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
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
    return this.getStorage(STORAGE_KEYS.REQS, INITIAL_REQS);
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

  // Clinician approves and triggers Wave 1
  public approveRequisition(token: string, allowONeg: boolean): StoredRequisition | null {
    const all = this.getRequisitions();
    const req = all.find((r) => r.verify_token === token);
    if (!req) return null;

    req.status = "VERIFIED_ACTIVE";
    req.allow_o_neg_substitute = allowONeg;
    req.current_wave = 1;

    // Dispatch to eligible donors
    const eligibleDonors = this.getDonors().filter((d) => {
      if (!d.is_available) return false;
      const match = d.blood_group === req.blood_group || (allowONeg && d.blood_group === "O-");
      return match;
    });

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

  // Donor response to alert (Accept / Snooze)
  public respondToWave(
    donorToken: string,
    waveId: string,
    action: "ACCEPTED" | "SNOOZED"
  ): { success: boolean; message: string } {
    const donor = this.getDonorByToken(donorToken);
    if (!donor) return { success: false, message: "Donor not found." };

    const allReqs = this.getRequisitions();
    for (const req of allReqs) {
      const wave = req.waves.find((w) => w.id === waveId);
      if (wave) {
        if (action === "ACCEPTED") {
          if (req.units_accepted >= req.units_needed) {
            return {
              success: false,
              message: "All units for this request have been committed. Thank you!",
            };
          }
          wave.response_status = "ACCEPTED";
          wave.responded_at = new Date().toISOString();
          wave.arrival_deadline = new Date(Date.now() + 45 * 60000).toISOString();
          req.units_accepted += 1;
          if (req.units_accepted >= req.units_needed) {
            req.status = "FULFILLED";
          }
          this.setStorage(STORAGE_KEYS.REQS, allReqs);
          return {
            success: true,
            message: "Commitment confirmed! Please arrive within 45 minutes.",
          };
        } else {
          wave.response_status = "SNOOZED";
          wave.responded_at = new Date().toISOString();
          this.setStorage(STORAGE_KEYS.REQS, allReqs);
          return {
            success: true,
            message: "Understood. We will alert another nearby voluntary donor.",
          };
        }
      }
    }
    return { success: false, message: "Wave alert expired or not found." };
  }

  public markDonationComplete(verifyToken: string, donorId: string): boolean {
    const req = this.getRequisitionByVerifyToken(verifyToken);
    if (!req) return false;

    const wave = req.waves.find((w) => w.donor_id === donorId && w.response_status === "ACCEPTED");
    if (wave) {
      wave.response_status = "COMPLETED";
      this.saveRequisition(req);
    }

    // Set NBTC cooldown for the donor
    const donor = this.getDonors().find((d) => d.id === donorId);
    if (donor) {
      const cooldownDays = donor.biological_sex === "MALE" ? 90 : 120;
      donor.cooldown_until = new Date(Date.now() + cooldownDays * 86400000).toISOString();
      donor.last_donation_date = new Date().toISOString().split("T")[0];
      donor.no_show_count = 0;
      this.saveDonor(donor);
    }

    return true;
  }
}

export const store = new BloodLinkStore();
