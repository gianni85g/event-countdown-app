// supabase/functions/clever-handler/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://yourdomain.com";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("❌ Missing RESEND_API_KEY environment variable");
    return { ok: false, error: "Missing API key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "My Moments <noreply@mymoments.app>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const error = await res.text();
    console.error("❌ Failed to send email:", error);
    return { ok: false, error };
  }
  return { ok: true };
}

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log("[clever-handler] 📦 Received payload:", payload);

    // Support both trigger payload and direct calls
    const record = payload.record || payload;

    const recipient = record.recipient || (Array.isArray(record.emails) ? record.emails[0] : undefined);
    const momentTitle = record.moment_title || record.momentTitle || "a Moment";
    const inviteMessage = record.message || record.inviteMessage || "Join the plan and share your ideas!";
    const ownerEmail = record.owner_email || record.ownerEmail || "unknown@nowhere";

    if (!recipient) {
      return new Response(JSON.stringify({ error: "Missing recipient" }), { status: 400 });
    }

    const subject = `You've been invited to a new Moment: ${momentTitle}`;
    const html = `
      <h2>You're invited to collaborate on a Moment</h2>
      <p>${inviteMessage}</p>
      <p><strong>From:</strong> ${ownerEmail}</p>
      <p>
        <a href="${APP_URL}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;">View Moment</a>
      </p>
    `;

    const result = await sendEmail(recipient, subject, html);
    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 500 });
    }
    console.log(`[clever-handler] ✅ Invitation email sent to ${recipient}`);
    return new Response(JSON.stringify({ ok: true, sent: 1 }), { status: 200 });
  } catch (error) {
    console.error("[clever-handler] ❌ Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});


