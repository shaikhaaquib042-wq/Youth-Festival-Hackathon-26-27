// ============================================================================
// BloodLink Edge Function: /request
// POST — Submit a new blood requisition
// ============================================================================
// Accepts requisition details + slip image, creates a PENDING_VERIFICATION
// record, and triggers a Make.com webhook to send the verification link
// to the duty doctor via WhatsApp.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAKE_WEBHOOK_VERIFY = Deno.env.get("MAKE_WEBHOOK_VERIFY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const formData = await req.formData();

    // ---- Extract fields ----
    const patientReference = formData.get("patient_reference") as string;
    const bloodGroup = formData.get("blood_group") as string;
    const component = formData.get("component") as string || "WHOLE_BLOOD";
    const unitsNeeded = parseInt(formData.get("units_needed") as string);
    const urgency = formData.get("urgency") as string;
    const hospitalId = formData.get("hospital_id") as string;
    const requesterPhone = formData.get("requester_phone") as string;
    const verifierPhone = formData.get("verifier_phone") as string;
    const slipImage = formData.get("slip_image") as File;

    // ---- Validation ----
    const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const validComponents = ["WHOLE_BLOOD", "SDP_PLATELETS", "PRBC"];
    const validUrgency = ["CRITICAL", "URGENT", "SCHEDULED"];

    if (!patientReference || !bloodGroup || !unitsNeeded || !urgency || !hospitalId || !requesterPhone || !verifierPhone || !slipImage) {
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

    if (!validComponents.includes(component)) {
      return new Response(JSON.stringify({ error: "Invalid blood component." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validUrgency.includes(urgency)) {
      return new Response(JSON.stringify({ error: "Invalid urgency level." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (unitsNeeded < 1 || unitsNeeded > 6) {
      return new Response(JSON.stringify({ error: "Units must be between 1 and 6." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Fetch hospital details ----
    const { data: hospital, error: hospitalErr } = await supabase
      .from("verified_hospitals")
      .select("id, name, location")
      .eq("id", hospitalId)
      .eq("is_active", true)
      .single();

    if (hospitalErr || !hospital) {
      return new Response(JSON.stringify({ error: "Hospital not found or inactive." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Upload slip image to Supabase Storage ----
    const fileExt = slipImage.name.split(".").pop() || "webp";
    const filePath = `slips/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from("requisition-slips")
      .upload(filePath, slipImage, {
        contentType: slipImage.type,
        upsert: false,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: "Failed to upload requisition slip." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Create requisition record ----
    const { data: requisition, error: reqErr } = await supabase
      .from("requisitions")
      .insert({
        patient_reference: patientReference,
        blood_group: bloodGroup,
        component,
        units_needed: unitsNeeded,
        urgency,
        hospital_id: hospitalId,
        hospital_name: hospital.name,
        hospital_location: hospital.location,
        verifier_phone: verifierPhone,
        requester_phone: requesterPhone,
        slip_image_path: filePath,
      })
      .select("id, verify_token")
      .single();

    if (reqErr || !requisition) {
      return new Response(JSON.stringify({ error: "Failed to create requisition." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Audit log ----
    await supabase.from("audit_logs").insert({
      entity_type: "requisition",
      entity_id: requisition.id,
      action: "CREATED",
      actor_type: "REQUESTER",
      metadata: { blood_group: bloodGroup, units_needed: unitsNeeded, urgency },
    });

    // ---- Trigger Make.com webhook for doctor WhatsApp verification ----
    if (MAKE_WEBHOOK_VERIFY) {
      try {
        await fetch(MAKE_WEBHOOK_VERIFY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verify_token: requisition.verify_token,
            verifier_phone: verifierPhone,
            hospital_name: hospital.name,
            blood_group: bloodGroup,
            component,
            units_needed: unitsNeeded,
            urgency,
            patient_reference: patientReference,
          }),
        });
      } catch {
        // Non-blocking — webhook failure doesn't break the flow
        console.error("Make.com webhook failed — manual verification required.");
      }
    }

    // ---- Return success with tracking link ----
    return new Response(
      JSON.stringify({
        success: true,
        request_id: requisition.id,
        track_url: `/track/${requisition.id}`,
        message: "Request submitted. Awaiting hospital verification.",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Request handler error:", err);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
