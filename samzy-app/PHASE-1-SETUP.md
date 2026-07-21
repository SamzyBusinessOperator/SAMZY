# SAMZY Phase 1 Setup

## Environment variables

Create `.env.local`:

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY

Never commit `.env.local`.

## Database

Open Supabase SQL Editor and run:

supabase/migrations/202607210001_phase1_foundation.sql

## Supabase authentication configuration

Site URL:
https://samzyai.com

Redirect URLs:
https://samzyai.com/auth/callback
https://www.samzyai.com/auth/callback
http://localhost:3000/auth/callback

## Local development

npm install
npm run dev

Open:
http://localhost:3000/signup
