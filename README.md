<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# unitrade

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/8fbb3d9e-e3ba-4983-9fcc-1ff726bdcd4b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in Supabase, Paystack, Resend, Prembly, and cron secrets.
3. Apply the SQL in `supabase/schema.sql`, then run the migrations in `supabase/migrations` in numeric order.
4. Configure Paystack webhook URL:
   `https://your-domain.com/api/paystack/webhook`
5. Configure a daily cron request to:
   `GET https://your-domain.com/api/cron/auto-release`
   with `Authorization: Bearer <CRON_SECRET>`.
6. Run the app:
   `npm run dev`
