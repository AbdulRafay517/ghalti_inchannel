# Ye Ghalti kis ki hai?

A joke blame counter. Two people sit side by side:

- **Left** — the button adds one to a shared blame count, stored in Supabase.
- **Right** — the count is always 0. The button plays a random excuse clip and shows a speech bubble over the photo: text, or a flexing-bicep animation.

Built with Next.js 15 (App Router), TypeScript, Tailwind v4 and Supabase (Postgres + Storage).

## How it works

- `src/app/page.tsx` is a server component. It loads the people and excuses on every request.
- `src/app/BlameBoard.tsx` is the client UI.
  - The left button calls the `increment_blame` RPC.
  - The right button calls `pickExcuse`, which never picks the same excuse twice in a row.
- Security:
  - Row-level security (RLS) gives the anon key **read-only** access.
  - The only write is through `increment_blame`, a `security definer` function. It can only increment the left person's count.

## Supabase setup

1. Create a project.
2. In the SQL editor, run the migrations in this order:
   - `supabase/migrations/0001_init.sql` creates the tables, RLS, the RPC and the public `media` bucket.
   - `supabase/migrations/0002_excuse_animation.sql` makes excuse text optional and adds the `animation` column.
3. Upload files to the `media` bucket:
   - Photos go in `photos/`.
   - Audio clips go in `audio/`.
4. Run `supabase/seed.sql`, or edit the rows in the Table Editor:
   - `people` has exactly one `left` row and one `right` row: `name`, `photo_path`.
   - `excuses` has one row per clip: `audio_path`, plus `text` and/or `animation` (`bicep_curl`).

Paths are relative to the bucket, for example `photos/kane.jpg`.

## Run locally

```bash
cp .env.example .env   # fill in your project URL and anon/publishable key
npm install
npm run dev            # http://localhost:3000
npm test               # unit tests (node --test)
```

### Docker

```bash
docker compose up --build   # http://localhost:3000
```

The `NEXT_PUBLIC_*` values are build args, because Next.js inlines them into the bundle at build time.

## Deploy (Vercel)

1. Import the repo in Vercel.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

Never put the database password in a `NEXT_PUBLIC_*` variable, because Next.js ships those to the browser.
