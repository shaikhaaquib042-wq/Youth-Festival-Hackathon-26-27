// ============================================================================
// BloodLink Edge Function: /verify/[verify_token]
// GET  — Fetch requisition details for doctor review
// POST — Approve & dispatch wave, reject, or mark fulfilled
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAKE_WEBHOOK_DISPATCH = Deno.env.get("MAKE_WEBHOOK_DISPATCH");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const url = new URL(req.url);
    const verifyToken = url.searchParams.get("token");

    if (!verifyToken) {
      return new Response(JSON.stringify({ error: "Missing verification token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- GET: Fetch requisition for doctor review ----
    if (req.method === "GET") {
      const { data: requisition, error } = await supabase
        .from("requisitions")
        .select(`
          id, patient_reference, blood_group, component, units_needed,
          units_accepted, urgency, hospital_name, status, slip_image_path,
          allow_o_neg_substitute, current_wave, created_at, expires_at
        `)
        .eq("verify_token", verifyToken)
        .single();

      if (error || !requisition) {
        return new Response(JSON.stringify({ error: "Requisition not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate signed URL for slip image (valid 1 hour)
      let slipImageUrl = null;
      if (requisition.slip_image_path) {
        const { data: signedUrl } = await supabase.storage
          .from("requisition-slips")
          .createSignedUrl(requisition.slip_image_path, 3600);
        slipImageUrl = signedUrl?.signedUrl || null;
      }

      // Fetch wave stats
      const { data: waves } = await supabase
        .from("dispatch_waves")
        .select("id, wave_number, response_status, distance_km, donor_id")
        .eq("requisition_id", requisition.id);

      return new Response(
        JSON.stringify({
          ...requisition,
          slip_image_url: slipImageUrl,
          waves: waves || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- POST: Doctor actions (approve, reject, fulfill, complete_donor) ----
    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action as string;

      // ---- APPROVE & DISPATCH WAVE 1 ----
      if (action === "approve") {
        const allowONeg = body.allow_o_neg_substitute === true;

        // Update requisition to VERIFIED_ACTIVE
        const { data: updated, error: updateErr } = await supabase
          .from("requisitions")
          .update({
            status: "VERIFIED_ACTIVE",
            verified_at: new Date().toISOString(),
            allow_o_neg_substitute: allowONeg,
          })
          .eq("verify_token", verifyToken)
          .eq("status", "PENDING_VERIFICATION")
          .select("id")
          .single();

        if (updateErr || !updated) {
          return new Response(
            JSON.stringify({ error: "Requisition already verified, rejected, or expired." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Audit log
        await supabase.from("audit_logs").insert({
          entity_type: "requisition",
          entity_id: updated.id,
          action: "VERIFIED",
          actor_type: "HOSPITAL_STAFF",
          metadata: { allow_o_neg_substitute: allowONeg },
        });

        // Dispatch Wave 1 via RPC
        const { data: wave, error: waveErr } = await supabase.rpc("dispatch_donor_wave", {
          p_requisition_id: updated.id,
          p_wave_cap: 12,
        });

        if (waveErr) {
          console.error("Wave dispatch error:", waveErr);
        }

        // Trigger Make.com to send WhatsApp alerts to matched donors
        if (MAKE_WEBHOOK_DISPATCH && wave && wave.length > 0) {
          try {
            await fetch(MAKE_WEBHOOK_DISPATCH, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requisition_id: updated.id, donors: wave }),
            });
          } catch {
            console.error("Make.com dispatch webhook failed.");
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Verified! Wave 1 dispatched to ${wave?.length || 0} nearby donors.`,
            donors_pinged: wave?.length || 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- REJECT ----
      if (action === "reject") {
        const { error: rejectErr } = await supabase
          .from("requisitions")
          .update({ status: "REJECTED" })
          .eq("verify_token", verifyToken)
          .eq("status", "PENDING_VERIFICATION");

        if (rejectErr) {
          return new Response(JSON.stringify({ error: "Failed to reject." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Requisition rejected." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- MARK FULFILLED ----
      if (action === "fulfill") {
        const { error: fulfillErr } = await supabase
          .from("requisitions")
          .update({ status: "FULFILLED" })
          .eq("verify_token", verifyToken)
          .in("status", ["VERIFIED_ACTIVE", "FULFILLED"]);

        if (fulfillErr) {
          return new Response(JSON.stringify({ error: "Failed to mark fulfilled." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Requisition marked as fulfilled." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- COMPLETE INDIVIDUAL DONOR (set cooldown) ----
      if (action === "complete_donor") {
        const donorId = body.donor_id as string;
        if (!donorId) {
          return new Response(JSON.stringify({ error: "Missing donor_id." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: result, error: completeErr } = await supabase.rpc(
          "complete_donation_and_cooldown",
          { p_verify_token: verifyToken, p_donor_id: donorId }
        );

        if (completeErr) {
          return new Response(JSON.stringify({ error: completeErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Verify handler error:", err);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
