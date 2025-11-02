# Email Notification Setup Guide

This guide shows you how to set up automatic email invitations when Moments are shared.

## Overview

When a user shares a Moment, the system:
1. ✅ Creates a notification in the database (already working)
2. ✅ Triggers a Supabase Edge Function
3. ✅ Sends an email via Resend API
4. ✅ Shows a success toast in the app

---

## 🧩 Step 1: Create the Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create the function
supabase functions new send-invite
```

### Option B: Manual Creation

1. Go to Supabase Dashboard → Functions
2. Click "Create a new function"
3. Name it `send-invite`
4. Paste the code from `supabase/functions/send-invite/index.ts`

---

## 🧩 Step 2: Deploy the Function

```bash
# Deploy with environment variables
supabase functions deploy send-invite
```

You'll see output like:
```
Deploying function send-invite...
Function deployed at: https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-invite
```

**Save this URL** - you'll need it for the trigger!

---

## 🧩 Step 3: Set Environment Variables

In Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions** → **Environment Variables**
2. Add:

```
RESEND_API_KEY=re_your_api_key_here
APP_URL=https://yourdomain.com
```

### Get Resend API Key:
1. Sign up at [https://resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Go to **API Keys** → **Create API Key**
3. Copy the key and paste it as `RESEND_API_KEY`

### Set APP_URL:
- Production: `https://yourdomain.com`
- Development: `http://localhost:5173` (or your dev port)

---

## 🧩 Step 4: Enable Required Extensions

In Supabase SQL Editor, run:

```sql
-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## 🧩 Step 5: Create the Database Trigger

**Before running the SQL**, open `setup_email_trigger_simple.sql` and replace:

```sql
function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-invite';
```

With your actual function URL from Step 2.

Then run `setup_email_trigger_simple.sql` in Supabase SQL Editor.

---

## 🧩 Step 6: Test the Setup

1. **Share a Moment:**
   - Log in as User 1
   - Share a Moment with User 2's email
   - You should see: `✅ Invitations sent to 1 user! Email notifications will be sent automatically.`

2. **Check Function Logs:**
   - Supabase Dashboard → **Edge Functions** → **send-invite** → **Logs**
   - Should see: `📩 Sending invitation to user@example.com`
   - Should see: `✅ Invitation email sent to user@example.com`

3. **Check Email:**
   - User 2 should receive an email with:
     - **Subject:** "You've been invited to a new Moment"
     - **Body:** Invitation message with "View Moment" button

---

## ✅ Expected Results

| Action | Result |
|--------|--------|
| User shares Moment | Toast notification appears: "✅ Invitations sent!" |
| Notification inserted | Database trigger fires |
| Edge Function called | Email sent via Resend |
| Recipient | Receives invitation email |

---

## 🔧 Troubleshooting

### Function not being called?

1. Check trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'notifications';
   ```

2. Check function URL is correct in trigger

3. Check Edge Function logs for errors

### Email not sending?

1. Verify `RESEND_API_KEY` is set in Edge Functions environment
2. Check Resend dashboard for API usage/quota
3. Check Edge Function logs for specific errors

### Toast not showing?

- The toast appears in the bottom-right corner
- It auto-dismisses after 5 seconds
- Check browser console for errors

---

## 📝 Files Created

- `supabase/functions/send-invite/index.ts` - Edge Function code
- `setup_email_trigger.sql` - Full trigger setup (with config)
- `setup_email_trigger_simple.sql` - Simplified trigger (you edit the URL)
- `EMAIL_SETUP.md` - This guide

---

## 🎉 Next Steps

After setup is complete:
- Users will automatically receive emails when Moments are shared
- The app shows success toasts when sharing
- All email sending happens asynchronously (doesn't block the UI)

Want to customize the email template? Edit `supabase/functions/send-invite/index.ts`!



