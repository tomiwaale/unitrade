// Supabase Edge Function: send-push
//
// Triggered by a Database Webhook on INSERT INTO notifications (wire this up
// in the Supabase Dashboard: Database → Webhooks → new webhook, table
// "notifications", event "Insert", type "Supabase Edge Function", function
// "send-push" — no SQL needed). Fires no matter which client created the
// notification row: the web's notify() helper (lib/notifications.ts) or the
// on_message_created DB trigger (016_mobile_support.sql) for mobile-originated
// chat messages.
//
// Deploy (from the repo root, not mobile/ — the CLI resolves this path
// relative to the working directory):
//   supabase functions deploy send-push --project-ref gwwznluprzkjpekhexzv
// Secrets (supabase secrets set ...):
//   FCM_PROJECT_ID            — Firebase project ID
//   FCM_SERVICE_ACCOUNT_EMAIL — service account client_email
//   FCM_SERVICE_ACCOUNT_KEY   — service account private_key (PEM, \n-escaped)
// (Download the service account JSON from Firebase Console → Project
// Settings → Service Accounts → Generate new private key.)
//
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically to
// every Edge Function — no need to set them manually.

import { createClient } from "jsr:@supabase/supabase-js@2";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_id: string | null;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: NotificationRow;
}

const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_SERVICE_ACCOUNT_EMAIL = Deno.env.get("FCM_SERVICE_ACCOUNT_EMAIL")!;
const FCM_SERVICE_ACCOUNT_KEY = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY")!.replace(/\\n/g, "\n");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Google's OAuth2 service-account flow: sign a short-lived RS256 JWT with
// the service account's private key, exchange it for an access token. FCM's
// HTTP v1 API only accepts OAuth2 bearer tokens (the legacy static server
// key API is deprecated), and there's no Deno-native firebase-admin SDK, so
// this is done by hand with the platform's Web Crypto implementation.
async function getAccessToken(): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: FCM_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(FCM_SERVICE_ACCOUNT_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const jwt = `${unsigned}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mint FCM access token: ${await response.text()}`);
  }
  const { access_token } = await response.json();
  return access_token;
}

async function sendToToken(accessToken: string, token: string, notification: NotificationRow) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: notification.title,
            body: notification.body ?? undefined,
          },
          data: {
            type: notification.type,
            related_id: notification.related_id ?? "",
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    // Stale/uninstalled-app tokens come back as NOT_FOUND/UNREGISTERED —
    // clean those up so we stop paying the round trip on every future push.
    if (errorBody.includes("UNREGISTERED") || errorBody.includes("NOT_FOUND")) {
      await supabase.from("device_tokens").delete().eq("token", token);
    } else {
      console.error(`[send-push] FCM error for token ${token}:`, errorBody);
    }
  }
}

Deno.serve(async (req) => {
  const payload = (await req.json()) as WebhookPayload;
  const notification = payload.record;

  const { data: devices, error } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", notification.user_id);

  if (error) {
    console.error("[send-push] Failed to load device tokens:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!devices || devices.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const accessToken = await getAccessToken();
  await Promise.all(devices.map((d) => sendToToken(accessToken, d.token, notification)));

  return new Response(JSON.stringify({ sent: devices.length }), { status: 200 });
});
