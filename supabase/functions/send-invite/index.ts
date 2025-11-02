// supabase/functions/send-invite/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Get environment variables
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://yourdomain.com";

// Function to send email via Resend API
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

// Main handler
serve(async (req: Request) => {
  try {
    const payload = await req.json();
    console.log("📦 Received payload:", payload);

    // 🧠 Support both trigger-based and manual API payloads
    const record = payload.record || payload;

    // Extract fields regardless of naming style
    const recipient =
      record.recipient || (Array.isArray(record.emails) ? record.emails[0] : undefined);
    const momentTitle = record.moment_title || record.momentTitle;
    const inviteMessage = record.message || record.inviteMessage;
    const ownerEmail = record.owner_email || record.ownerEmail;

    if (!recipient || !momentTitle || !ownerEmail) {
      console.error("❌ Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }

    const subject = `You've been invited to a new Moment: ${momentTitle}`;
    const html = `
      <h2>You're invited to collaborate on a Moment</h2>
      <p>${inviteMessage || "Join the plan and share your ideas!"}</p>
      <p><strong>From:</strong> ${ownerEmail}</p>
      <p>
        <a href="${APP_URL}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;">View Moment</a>
      </p>
    `;

    console.log(`📩 Sending invitation to ${recipient}...`);
    const result = await sendEmail(recipient, subject, html);

    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 500,
      });
    }

    console.log(`✅ Invitation email sent to ${recipient}`);
    return new Response(JSON.stringify({ ok: true, sent: 1 }), { status: 200 });
  } catch (error) {
    console.error("❌ Error in handler:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
// supabase/functions/send-invite/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/dotenv/load.ts";

// Send via Resend or any mail API
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("VITE_APP_URL") || "http://localhost:5173";

serve(async (req) => {
  try {
    const payload = await req.json();

    // Supabase trigger sends the row data
    const record = payload.record;
    const { recipient, sender, message, link } = record;

    if (!recipient || !sender || !message) {
      console.error("❌ Missing required fields in notification record");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("📩 Sending invitation to", recipient);

    // If no RESEND_API_KEY, just log (for development)
    if (!RESEND_API_KEY) {
      console.log("⚠️ RESEND_API_KEY not set - skipping email send");
      console.log("Would send email to:", recipient);
      console.log("Subject: You've been invited to a new Moment");
      console.log("Body:", message);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email skipped (no API key)",
          recipient 
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailBody = `
      <h2>You've been invited to a new Moment</h2>
      <p><strong>${sender}</strong> invited you to join a new Moment.</p>
      <p>${message}</p>
      <br>
      <a href="${APP_URL}${link}" style="
        background-color:#2563eb;
        color:white;
        padding:10px 18px;
        border-radius:6px;
        text-decoration:none;
        display:inline-block;
        margin-top:10px;">View Moment</a>
      <br><br>
      <p style="color:#666;font-size:12px;">If you don't have an account, you can sign up at ${APP_URL}/login</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "My Moments <noreply@mymoments.app>",
        to: recipient,
        subject: "You've been invited to a new Moment",
        html: emailBody,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Email send failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await res.json();
    console.log("✅ Invitation email sent to", recipient);
    return new Response(
      JSON.stringify({ success: true, recipient, emailId: result.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});



