# Sun & Soul Egypt

## Local admin

```powershell
npm start
```

Open `http://127.0.0.1:3000/admin` to manage journeys, photos, drafts, covers, and publishing. Journey content is entered in English; missing Arabic content is generated automatically when a journey is saved.

Local data is stored in `.data/` and uploaded images in `uploads/`. Both directories are ignored by Git. Keep all credentials in the local ignored `.env` file.

## Vercel

Vercel deployments use Supabase Database and Storage because serverless instances do not keep local files. Run `supabase/schema.sql` once in Supabase SQL Editor, then configure these server-side environment variables in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=trip-images`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`

Never commit `.env` or any service role key. The admin password and session secret are read only from environment variables.
