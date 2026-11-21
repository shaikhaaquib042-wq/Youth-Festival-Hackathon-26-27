// ============================================================================
// BloodLink Edge Function: /donor/[donor_token]
// GET  — Fetch donor profile & active alerts
// POST — Respond to alert (accept/snooze), toggle availability, delete data
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const url = new URL(req.url);
    const donorToken = url.searchParams.get("token");

    if (!donorToken) {
      return new Response(JSON.stringify({ error: "Missing donor token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch donor
    const { data: donor, error: donorErr } = await supabase
      .from("donors")
      .select("*")
      .eq("donor_token", donorToken)
      .single();

    if (donorErr || !donor) {
      return new Response(JSON.stringify({ error: "Invalid donor token." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ======== GET: Donor profile + active alerts ========
    if (req.method === "GET") {
      // Fetch active alerts (PINGED status)
      const { data: activeAlerts } = await supabase
        .from("dispatch_waves")
        .select(`
          id, wave_number, distance_km, response_status, pinged_at,
          arrival_deadline,
          requisitions!inner (
            id, blood_group, component, units_needed, units_accepted,
            urgency, hospital_name, hospital_id, status
          )
        `)
        .eq("donor_id", donor.id)
        .in("response_status", ["PINGED", "ACCEPTED"])
        .order("pinged_at", { ascending: false });

      // Fetch hospital locations for Google Maps links
      const hospitalIds = [
        ...new Set(
          (activeAlerts || [])
            .map((a: any) => a.requisitions?.hospital_id)
            .filter(Boolean)
        ),
      ];

      let hospitalMap: Record<string, any> = {};
      if (hospitalIds.length > 0) {
        const { data: hospitals } = await supabase
          .from("verified_hospitals")
          .select("id, name, address, official_bloodbank_phone")
          .in("id", hospitalIds);

        hospitalMap = (hospitals || []).reduce((acc: Record<string, any>, h: any) => {
          acc[h.id] = h;
          return acc;
        }, {});
      }

      // Build alerts with hospital details
      const alerts = (activeAlerts || []).map((alert: any) => {
        const req = alert.requisitions;
        const hospital = hospitalMap[req?.hospital_id] || {};
        return {
          wave_id: alert.id,
          response_status: alert.response_status,
          blood_group: req?.blood_group,
          component: req?.component,
          urgency: req?.urgency,
          units_needed: req?.units_needed,
          units_accepted: req?.units_accepted,
          hospital_name: req?.hospital_name,
          hospital_address: hospital.address || null,
          hospital_phone: hospital.official_bloodbank_phone || null,
          distance_km: alert.distance_km,
          pinged_at: alert.pinged_at,
          arrival_deadline: alert.arrival_deadline,
          google_maps_url: hospital.address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.address)}`
            : null,
        };
      });

      // Calculate cooldown status
      const now = new Date();
      const cooldownUntil = new Date(donor.cooldown_until);
      const isOnCooldown = cooldownUntil > now;
      const cooldownDaysLeft = isOnCooldown
        ? Math.ceil((cooldownUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return new Response(
        JSON.stringify({
          full_name: donor.full_name,
          blood_group: donor.blood_group,
          locality: donor.locality_label,
          is_available: donor.is_available,
          is_on_cooldown: isOnCooldown,
          cooldown_until: isOnCooldown ? donor.cooldown_until : null,
          cooldown_days_left: cooldownDaysLeft,
          last_donation_date: donor.last_donation_date,
          no_show_count: donor.no_show_count,
          alerts,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ======== POST: Donor actions ========
    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action as string;

      // ---- RESPOND TO ALERT (accept/snooze) ----
      if (action === "accept" || action === "snooze") {
        const waveId = body.wave_id as string;
        if (!waveId) {
          return new Response(JSON.stringify({ error: "Missing wave_id." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const responseAction = action === "accept" ? "ACCEPTED" : "SNOOZED";

        const { data: result, error: rpcErr } = await supabase.rpc("respond_to_wave", {
          p_donor_token: donorToken,
          p_wave_id: waveId,
          p_action: responseAction,
        });

        if (rpcErr) {
          return new Response(JSON.stringify({ error: rpcErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- TOGGLE AVAILABILITY ----
      if (action === "toggle_availability") {
        const { error: toggleErr } = await supabase
          .from("donors")
          .update({ is_available: !donor.is_available })
          .eq("id", donor.id);

        if (toggleErr) {
          return new Response(JSON.stringify({ error: "Failed to update availability." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("audit_logs").insert({
          entity_type: "donor",
          entity_id: donor.id,
          action: donor.is_available ? "PAUSED" : "UNPAUSED",
          actor_type: "DONOR",
        });

        return new Response(
          JSON.stringify({
            success: true,
            is_available: !donor.is_available,
            message: !donor.is_available
              ? "You are now available for blood donation alerts."
              : "You have paused alerts. You will not receive new pings.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Unknown action." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ======== DELETE: DPDP data deletion ========
    if (req.method === "DELETE") {
      // Audit log BEFORE deletion
      await supabase.from("audit_logs").insert({
        entity_type: "donor",
        entity_id: donor.id,
        action: "DATA_DELETED",
        actor_type: "DONOR",
        metadata: { blood_group: donor.blood_group, locality: donor.locality_label },
      });

      // Delete all dispatch waves for this donor
      await supabase
        .from("dispatch_waves")
        .delete()
        .eq("donor_id", donor.id);

      // Delete the donor record
      await supabase.from("donors").delete().eq("id", donor.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Your data has been permanently deleted as per DPDP Act compliance.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Donor handler error:", err);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
