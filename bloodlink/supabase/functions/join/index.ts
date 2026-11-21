// ============================================================================
// BloodLink Edge Function: /join
// POST — Register a new voluntary blood donor
// ============================================================================
// 30-second onboarding: name, phone, sex, blood group, locality, consent.
// Sets initial NBTC cooldown based on last_donation_date if provided.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Pune localities with approximate coordinates for dropdown selection
const PUNE_LOCALITIES: Record<string, { lat: number; lng: number }> = {
  "Sinhagad Road":    { lat: 18.4789, lng: 73.8260 },
  "Dattawadi":        { lat: 18.4985, lng: 73.8395 },
  "Sadashiv Peth":    { lat: 18.5120, lng: 73.8530 },
  "Deccan Gymkhana":  { lat: 18.5160, lng: 73.8410 },
  "Kothrud":          { lat: 18.5074, lng: 73.8077 },
  "Warje":            { lat: 18.4860, lng: 73.8020 },
  "Karve Nagar":      { lat: 18.4950, lng: 73.8130 },
  "Erandwane":        { lat: 18.5100, lng: 73.8330 },
  "Shivajinagar":     { lat: 18.5316, lng: 73.8474 },
  "Parvati":          { lat: 18.4970, lng: 73.8530 },
  "Bibwewadi":        { lat: 18.4800, lng: 73.8640 },
  "Dhankawadi":       { lat: 18.4590, lng: 73.8460 },
  "Katraj":           { lat: 18.4480, lng: 73.8580 },
  "Narayan Peth":     { lat: 18.5160, lng: 73.8560 },
  "Peth Area":        { lat: 18.5200, lng: 73.8600 },
  "Camp":             { lat: 18.5130, lng: 73.8800 },
  "Koregaon Park":    { lat: 18.5362, lng: 73.8930 },
  "Hadapsar":         { lat: 18.5020, lng: 73.9400 },
  "Kondhwa":          { lat: 18.4680, lng: 73.8930 },
  "Undri":            { lat: 18.4530, lng: 73.9050 },
  "Baner":            { lat: 18.5590, lng: 73.7800 },
  "Aundh":            { lat: 18.5580, lng: 73.8070 },
  "Pimple Saudagar":  { lat: 18.5970, lng: 73.8070 },
  "Wakad":            { lat: 18.5990, lng: 73.7630 },
  "Hinjewadi":        { lat: 18.5910, lng: 73.7390 },
  "Viman Nagar":      { lat: 18.5670, lng: 73.9140 },
  "Kharadi":          { lat: 18.5530, lng: 73.9410 },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = await req.json();

    // ---- Extract fields ----
    const fullName = (body.full_name || "").trim();
    const whatsappPhone = (body.whatsapp_phone || "").trim();
    const biologicalSex = (body.biological_sex || "").toUpperCase();
    const bloodGroup = (body.blood_group || "").toUpperCase();
    const localityLabel = (body.locality || "").trim();
    const lastDonationDate = body.last_donation_date || null;
    const dpdpConsent = body.dpdp_consent === true;
    // Optional: browser GPS coordinates override locality defaults
    const gpsLat = body.gps_lat ? parseFloat(body.gps_lat) : null;
    const gpsLng = body.gps_lng ? parseFloat(body.gps_lng) : null;

    // ---- Validation ----
    const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const validSex = ["MALE", "FEMALE"];

    if (!fullName || !whatsappPhone || !biologicalSex || !bloodGroup || !localityLabel) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validBloodGroups.includes(bloodGroup)) {
      return new Response(JSON.stringify({ error: "Invalid blood group." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validSex.includes(biologicalSex)) {
      return new Response(JSON.stringify({ error: "Invalid biological sex. Must be MALE or FEMALE." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dpdpConsent) {
      return new Response(
        JSON.stringify({ error: "DPDP consent is required to register as a donor." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Resolve location ----
    let lat: number;
    let lng: number;

    if (gpsLat && gpsLng) {
      lat = gpsLat;
      lng = gpsLng;
    } else if (PUNE_LOCALITIES[localityLabel]) {
      lat = PUNE_LOCALITIES[localityLabel].lat;
      lng = PUNE_LOCALITIES[localityLabel].lng;
    } else {
      return new Response(
        JSON.stringify({
          error: "Unknown locality. Please select from the list or enable GPS.",
          valid_localities: Object.keys(PUNE_LOCALITIES),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Calculate initial cooldown if last donation date provided ----
    let cooldownUntil = new Date().toISOString(); // Default: eligible now
    if (lastDonationDate) {
      const lastDate = new Date(lastDonationDate);
      const cooldownDays = biologicalSex === "MALE" ? 90 : 120;
      const cooldownDate = new Date(lastDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
      if (cooldownDate > new Date()) {
        cooldownUntil = cooldownDate.toISOString();
      }
    }

    // ---- Check for duplicate phone ----
    const { data: existing } = await supabase
      .from("donors")
      .select("id, donor_token")
      .eq("whatsapp_phone", whatsappPhone)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "You are already registered! Here is your donor dashboard link.",
          donor_token: existing.donor_token,
          donor_url: `/donor/${existing.donor_token}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Insert donor ----
    const locationPoint = `SRID=4326;POINT(${lng} ${lat})`;

    const { data: donor, error: insertErr } = await supabase
      .from("donors")
      .insert({
        full_name: fullName,
        whatsapp_phone: whatsappPhone,
        biological_sex: biologicalSex,
        blood_group: bloodGroup,
        location: locationPoint,
        locality_label: localityLabel,
        last_donation_date: lastDonationDate,
        cooldown_until: cooldownUntil,
      })
      .select("id, donor_token")
      .single();

    if (insertErr || !donor) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to register donor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Audit log ----
    await supabase.from("audit_logs").insert({
      entity_type: "donor",
      entity_id: donor.id,
      action: "REGISTERED",
      actor_type: "DONOR",
      metadata: { blood_group: bloodGroup, locality: localityLabel },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome to BloodLink! You will receive alerts when nearby hospitals need your blood group.",
        donor_token: donor.donor_token,
        donor_url: `/donor/${donor.donor_token}`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Join handler error:", err);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
