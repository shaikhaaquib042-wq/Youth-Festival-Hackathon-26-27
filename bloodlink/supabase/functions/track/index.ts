// ============================================================================
// BloodLink Edge Function: /track/[request_id]
// GET — Live requisition status for patient family & hospital staff
// ============================================================================
// Designed for 15-second HTTP polling with edge cache headers.
// No WebSockets — stays within Supabase free tier limits.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const url = new URL(req.url);
    const requestId = url.searchParams.get("id");

    if (!requestId) {
      return new Response(JSON.stringify({ error: "Missing request ID." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch requisition (limited fields — no sensitive data)
    const { data: requisition, error: reqErr } = await supabase
      .from("requisitions")
      .select(`
        id, blood_group, component, units_needed, units_accepted,
        urgency, hospital_name, hospital_id, status, current_wave,
        current_radius_meters, created_at, expires_at, verified_at, fulfilled_at
      `)
      .eq("id", requestId)
      .single();

    if (reqErr || !requisition) {
      return new Response(JSON.stringify({ error: "Requisition not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-expire if verified active but past expiration timestamp
    if (requisition.status === "VERIFIED_ACTIVE" && new Date(requisition.expires_at) < new Date()) {
      await supabase.from("requisitions").update({ status: "EXPIRED" }).eq("id", requestId);
      requisition.status = "EXPIRED";
    }

    // Fetch hospital blood bank contact
    const { data: hospital } = await supabase
      .from("verified_hospitals")
      .select("official_bloodbank_phone")
      .eq("id", requisition.hospital_id)
      .single();

    // Fetch wave summary (no donor PII exposed)
    const { data: waves } = await supabase
      .from("dispatch_waves")
      .select("wave_number, response_status, distance_km, pinged_at, arrival_deadline")
      .eq("requisition_id", requestId)
      .order("wave_number", { ascending: true })
      .order("distance_km", { ascending: true });

    // Compute wave summary stats
    const waveSummary = (waves || []).reduce(
      (acc: Record<string, { total: number; accepted: number; completed: number; radius_km: number }>, w) => {
        const key = `wave_${w.wave_number}`;
        if (!acc[key]) {
          acc[key] = { total: 0, accepted: 0, completed: 0, radius_km: 0 };
        }
        acc[key].total++;
        if (w.response_status === "ACCEPTED") acc[key].accepted++;
        if (w.response_status === "COMPLETED") acc[key].completed++;
        acc[key].radius_km = Math.max(acc[key].radius_km, Number(w.distance_km));
        return acc;
      },
      {}
    );

    // Count active arrivals with countdowns
    const activeArrivals = (waves || [])
      .filter((w) => w.response_status === "ACCEPTED" && w.arrival_deadline)
      .map((w) => ({
        arrival_deadline: w.arrival_deadline,
        distance_km: w.distance_km,
      }));

    // Build e-RaktKosh parallel lookup URL
    const eRaktKoshUrl = `https://www.eraktkosh.in/BLDAHIMS/bloodbank/transactions/bbloodneed.html`;

    const responseBody = {
      ...requisition,
      bloodbank_phone: hospital?.official_bloodbank_phone || null,
      wave_summary: waveSummary,
      active_arrivals: activeArrivals,
      eraktkosh_url: eRaktKoshUrl,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Edge cache: serve stale for up to 10s, revalidate in background
        "Cache-Control": "s-maxage=10, stale-while-revalidate=5",
      },
    });
  } catch (err) {
    console.error("Track handler error:", err);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
