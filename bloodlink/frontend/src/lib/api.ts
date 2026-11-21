// ============================================================================
// BloodLink API Client & Resilient Data Layer
// ============================================================================
import { EDGE_FN_URL } from "./supabase";
import { store, StoredRequisition, StoredDonor } from "./store";

async function edgeFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${EDGE_FN_URL}${path}`, {
      ...options,
      headers: {
        ...(options?.headers || {}),
      },
    });
    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json.error || `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Network error" };
  }
}

// ---- /request ----
export async function submitRequest(formData: FormData) {
  try {
    const res = await edgeFetch("/request", {
      method: "POST",
      body: formData,
    });
    if (res.data) return res;

    // Resilient local simulation
    const patientRef = formData.get("patient_reference") as string;
    const bloodGroup = formData.get("blood_group") as string;
    const component = (formData.get("component") as string) || "WHOLE_BLOOD";
    const unitsNeeded = parseInt(formData.get("units_needed") as string) || 1;
    const urgency = (formData.get("urgency") as any) || "CRITICAL";
    const hospitalId = formData.get("hospital_id") as string;
    const requesterPhone = formData.get("requester_phone") as string;
    const verifierPhone = formData.get("verifier_phone") as string;

    const hospitals = [
      { id: "hosp-sahyadri-deccan", name: "Sahyadri Super Speciality Hospital, Deccan" },
      { id: "hosp-deenanath", name: "Deenanath Mangeshkar Hospital & Research Centre" },
      { id: "hosp-bharati", name: "Bharati Hospital & Research Centre" },
      { id: "hosp-sassoon", name: "Sassoon General Hospital" },
      { id: "hosp-jehangir", name: "Jehangir Hospital" },
    ];
    const hospital = hospitals.find((h) => h.id === hospitalId) || hospitals[0];

    const newReqId = `req-pune-${Date.now().toString().slice(-4)}`;
    const newVerifyToken = `verify-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10)}`;

    const newReq: StoredRequisition = {
      id: newReqId,
      verify_token: newVerifyToken,
      patient_reference: patientRef,
      blood_group: bloodGroup,
      component,
      units_needed: unitsNeeded,
      units_accepted: 0,
      urgency,
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      requester_phone: requesterPhone,
      verifier_phone: verifierPhone,
      allow_o_neg_substitute: false,
      status: "PENDING_VERIFICATION",
      current_wave: 0,
      current_radius_meters: 3000,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 12 * 3600000).toISOString(),
      waves: [],
    };

    store.saveRequisition(newReq);

    return {
      data: {
        success: true,
        request_id: newReq.id,
        verify_token: newReq.verify_token,
        track_url: `/track/${newReq.id}`,
        message: "Request submitted. Awaiting hospital duty doctor sign-off.",
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// ---- /verify ----
export async function getVerification(token: string) {
  const res = await edgeFetch(`/verify?token=${token}`);
  if (res.data) return res;

  const req = store.getRequisitionByVerifyToken(token);
  if (req) return { data: req, error: null };
  return { data: null, error: "Requisition not found or token invalid." };
}

export async function postVerification(token: string, body: any) {
  const res = await edgeFetch(`/verify?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.data) return res;

  if (body.action === "approve") {
    const updated = store.approveRequisition(token, body.allow_o_neg_substitute);
    if (updated) {
      return {
        data: {
          success: true,
          message: `Verified! Wave 1 dispatched to ${updated.waves.length} nearby donors.`,
          matching_metrics: updated.matching_metrics,
        },
        error: null,
      };
    }
  } else if (body.action === "reject") {
    store.rejectRequisition(token);
    return { data: { success: true, message: "Requisition rejected." }, error: null };
  } else if (body.action === "fulfill") {
    store.fulfillRequisition(token);
    return { data: { success: true, message: "Requisition marked fulfilled." }, error: null };
  } else if (body.action === "complete_donor") {
    store.markDonationComplete(token, body.donor_id);
    return { data: { success: true, message: "Donation recorded and cooldown locked." }, error: null };
  }

  return { data: null, error: "Action could not be completed." };
}

// ---- /track ----
export async function getTrackingStatus(requestId: string) {
  const res = await edgeFetch(`/track?id=${requestId}`);
  if (res.data) return res;

  const req = store.getRequisitionById(requestId);
  if (req) {
    const waveSummary = req.waves.reduce((acc: any, w) => {
      const k = `wave_${w.wave_number}`;
      if (!acc[k]) acc[k] = { total: 0, accepted: 0, completed: 0, radius_km: 3.0 };
      acc[k].total++;
      if (w.response_status === "ACCEPTED") acc[k].accepted++;
      if (w.response_status === "COMPLETED") acc[k].completed++;
      acc[k].radius_km = Math.max(acc[k].radius_km, w.distance_km);
      return acc;
    }, {});

    const activeArrivals = req.waves
      .filter((w) => w.response_status === "ACCEPTED" && w.arrival_deadline)
      .map((w) => ({
        arrival_deadline: w.arrival_deadline,
        distance_km: w.distance_km,
      }));

    return {
      data: {
        ...req,
        bloodbank_phone: "+912067213333",
        wave_summary: waveSummary,
        active_arrivals: activeArrivals,
        eraktkosh_url: "https://www.eraktkosh.in/BLDAHIMS/bloodbank/transactions/bbloodneed.html",
      },
      error: null,
    };
  }

  return { data: null, error: "Tracking link expired or not found." };
}

// ---- /join ----
export async function registerDonor(body: any) {
  const res = await edgeFetch("/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.data) return res;

  const newDonorToken = `donor-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10)}`;
  const donor: StoredDonor = {
    id: `d-${Date.now().toString().slice(-4)}`,
    donor_token: newDonorToken,
    full_name: body.full_name,
    whatsapp_phone: body.whatsapp_phone,
    biological_sex: body.biological_sex,
    blood_group: body.blood_group,
    locality: body.locality,
    campus_or_community: body.campus_or_community,
    gps_lat: body.gps_lat,
    gps_lng: body.gps_lng,
    is_available: true,
    last_donation_date: body.last_donation_date,
    no_show_count: 0,
    created_at: new Date().toISOString(),
  };

  store.saveDonor(donor);

  return {
    data: {
      success: true,
      donor_token: donor.donor_token,
      donor_url: `/donor/${donor.donor_token}`,
      message: "Voluntary donor registration successful!",
    },
    error: null,
  };
}

// ---- /donor ----
export async function getDonorProfile(token: string) {
  const res = await edgeFetch(`/donor?token=${token}`);
  if (res.data) return res;

  const donor = store.getDonorByToken(token);
  if (!donor) return { data: null, error: "Invalid donor capability token." };

  // Calculate alerts matching donor
  const allReqs = store.getRequisitions().filter((r) => r.status === "VERIFIED_ACTIVE");
  const alerts: any[] = [];

  for (const req of allReqs) {
    const wave = req.waves.find((w) => w.donor_id === donor.id || w.donor_name === donor.full_name);
    if (wave && ["PINGED", "ACCEPTED"].includes(wave.response_status)) {
      alerts.push({
        wave_id: wave.id,
        response_status: wave.response_status,
        blood_group: req.blood_group,
        component: req.component,
        urgency: req.urgency,
        units_needed: req.units_needed,
        units_accepted: req.units_accepted,
        hospital_name: req.hospital_name,
        hospital_address: req.hospital_address || "Pune, Maharashtra",
        hospital_phone: "+912067213333",
        distance_km: wave.distance_km,
        pinged_at: wave.pinged_at,
        arrival_deadline: wave.arrival_deadline,
        google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.hospital_name)}`,
      });
    }
  }

  const now = new Date();
  const cooldownUntil = donor.cooldown_until ? new Date(donor.cooldown_until) : null;
  const isOnCooldown = cooldownUntil ? cooldownUntil > now : false;
  const cooldownDaysLeft = isOnCooldown
    ? Math.ceil((cooldownUntil!.getTime() - now.getTime()) / 86400000)
    : 0;

  return {
    data: {
      full_name: donor.full_name,
      blood_group: donor.blood_group,
      locality: donor.locality,
      campus_or_community: donor.campus_or_community,
      is_available: donor.is_available,
      is_on_cooldown: isOnCooldown,
      cooldown_until: donor.cooldown_until,
      cooldown_days_left: cooldownDaysLeft,
      last_donation_date: donor.last_donation_date,
      no_show_count: donor.no_show_count,
      alerts,
    },
    error: null,
  };
}

export async function postDonorAction(token: string, body: any) {
  const res = await edgeFetch(`/donor?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.data) return res;

  if (body.action === "accept" || body.action === "snooze") {
    const act = body.action === "accept" ? "ACCEPTED" : "SNOOZED";
    const result = store.respondToWave(token, body.wave_id, act);
    return { data: result, error: null };
  } else if (body.action === "toggle_availability") {
    const donor = store.getDonorByToken(token);
    if (donor) {
      donor.is_available = !donor.is_available;
      store.saveDonor(donor);
      return {
        data: {
          success: true,
          is_available: donor.is_available,
          message: donor.is_available ? "Alerts active" : "Alerts paused",
        },
        error: null,
      };
    }
  }

  return { data: null, error: "Action failed." };
}

export async function deleteDonorData(token: string) {
  const res = await edgeFetch(`/donor?token=${token}`, { method: "DELETE" });
  if (res.data) return res;

  store.deleteDonor(token);
  return {
    data: { success: true, message: "Your data has been permanently deleted under DPDP Act." },
    error: null,
  };
}

// Pre-whitelisted accredited Pune hospitals
export async function getHospitals() {
  return {
    data: [
      { id: "hosp-deenanath", name: "Deenanath Mangeshkar Hospital Blood Bank", area_label: "Erandwane / Deccan" },
      { id: "hosp-sahyadri-deccan", name: "Sahyadri Super Speciality Hospital", area_label: "Deccan Gymkhana" },
      { id: "hosp-poona", name: "Poona Hospital & Research Centre", area_label: "Sadashiv Peth" },
      { id: "hosp-jankalyan", name: "Jankalyan Raktapedhi (Blood Bank)", area_label: "Sadashiv Peth / Tilak Road" },
      { id: "hosp-bharati", name: "Bharati Hospital Blood Bank", area_label: "Dhankawadi / Sinhagad Rd" },
    ],
    error: null,
  };
}

export const PUNE_LOCALITIES = [
  "Sinhagad Road", "Dattawadi", "Sadashiv Peth", "Deccan Gymkhana",
  "Kothrud", "Warje", "Karve Nagar", "Erandwane", "Shivajinagar",
  "Parvati", "Bibwewadi", "Dhankawadi", "Katraj", "Narayan Peth",
  "Peth Area", "Camp", "Koregaon Park", "Hadapsar", "Kondhwa",
  "Undri", "Baner", "Aundh", "Pimple Saudagar", "Wakad",
  "Hinjewadi", "Viman Nagar", "Kharadi",
];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const COMPONENTS = [
  { value: "WHOLE_BLOOD", label: "Whole Blood" },
  { value: "SDP_PLATELETS", label: "Single Donor Platelets (SDP)" },
  { value: "PRBC", label: "Packed Red Blood Cells (PRBC)" },
];
export const URGENCY_LEVELS = [
  { value: "CRITICAL", label: "Critical — Immediate" },
  { value: "URGENT", label: "Urgent — Within hours" },
  { value: "SCHEDULED", label: "Scheduled — Planned" },
];

export const CAMPUS_COMMUNITY_OPTIONS = [
  "Fergusson College",
  "COEP",
  "SPPU",
  "VIT Pune",
  "Sinhagad Road",
  "Kothrud",
  "Other",
];

// ---- Demo / NBTC / Seasonal Simulators ----
export async function getLeanMonthEligibleDonors() {
  return store.getLeanMonthEligibleDonors();
}

export async function recordLeanReminder(donorId: string) {
  return store.recordLeanReminder(donorId);
}

export async function simulateNoShowBackfill(reqId?: string) {
  return store.simulateNoShowBackfill(reqId);
}
