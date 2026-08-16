// Supabase Edge Function: ingest-telemetry
// Deploy with: supabase functions deploy ingest-telemetry --no-verify-jwt
// (--no-verify-jwt because devices authenticate with their own per-project
// deviceToken below, not a Supabase user session.)
//
// ESP32/ESP8266/NodeMCU firmware (or an MQTT bridge) POSTs here so live
// status/sensor data lands in project_telemetry, without ever giving
// firmware a Supabase service-role key. Each device only knows its
// project's deviceToken, checked against the projects table.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Use POST.', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { projectId, deviceToken, status, temperature, humidity, batteryLevel, alerts } = body;

  if (!projectId || !deviceToken) {
    return new Response(JSON.stringify({ error: 'projectId and deviceToken are required.' }), { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, device_token')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) {
    return new Response(JSON.stringify({ error: 'Unknown project.' }), { status: 404 });
  }
  if (project.device_token !== deviceToken) {
    return new Response(JSON.stringify({ error: 'Invalid device token.' }), { status: 401 });
  }

  const { error } = await admin.from('project_telemetry').upsert({
    project_id: projectId,
    status: status || 'online',
    temperature: temperature ?? null,
    humidity: humidity ?? null,
    battery_level: batteryLevel ?? null,
    alerts: alerts || [],
    last_seen: new Date().toISOString(),
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});
