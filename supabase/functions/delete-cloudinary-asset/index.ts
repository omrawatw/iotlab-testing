// Supabase Edge Function: delete-cloudinary-asset
// Deploy with: supabase functions deploy delete-cloudinary-asset
// Requires secrets:
//   supabase secrets set CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
//
// Cloudinary's delete API requires a *signed* request (API key + secret),
// which must never live in browser code. This function holds those
// credentials as Edge Function secrets and only deletes an asset after
// confirming the caller is a signed-in admin (checked with the service
// role key, which bypasses RLS — that's fine here because this code runs
// server-side, never in the browser).
//
// CORS: supabase.functions.invoke() sends an Authorization header and a
// JSON content type, which makes the browser issue a preflight OPTIONS
// request first. Without handling OPTIONS, that preflight gets a 405 and
// the browser blocks the real POST before it's ever sent — so this is not
// optional even though every real caller uses POST.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME')!;
const CLOUDINARY_API_KEY = Deno.env.get('CLOUDINARY_API_KEY')!;
const CLOUDINARY_API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function sha1(input: string) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Use POST.' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'Sign in required.' }, 401);

    // Verify the caller's JWT and that they're an admin.
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Invalid authentication.' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: adminRow, error: adminError } = await admin
      .from('admins').select('id').eq('id', userData.user.id).maybeSingle();
    if (adminError) return json({ error: 'Failed to verify admin.' }, 500);
    if (!adminRow) return json({ error: 'Admin access required.' }, 403);

    const { publicId, resourceType } = await req.json();
    if (!publicId) return json({ error: 'publicId is required.' }, 400);

    const type = ['image', 'video', 'raw'].includes(resourceType) ? resourceType : 'image';
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = await sha1(paramsToSign);

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('timestamp', String(timestamp));
    form.append('api_key', CLOUDINARY_API_KEY);
    form.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/destroy`, {
      method: 'POST',
      body: form,
    });
    const result = await res.json();

    if (result.result !== 'ok' && result.result !== 'not found') {
      return json({ error: result.result || 'Cloudinary delete failed.' }, 502);
    }
    return json({ success: true, result: result.result });
  } catch (err) {
    console.error('delete-cloudinary-asset error:', err);
    return json({ error: err instanceof Error ? err.message : 'Unexpected server error.' }, 500);
  }
});
