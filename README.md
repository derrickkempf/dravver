# dravver — site

Landing page for dravver. Built with Nuxt 3.

## Setup

```bash
cp .env.example .env
# edit .env and set ADMIN_SECRET to something only you know

npm install
npm run dev
```

## Adding your photo

Drop `avatar.jpg` in the `public/` folder. It shows up in the "meet your agent" circle automatically.

## Admin: uploading drawings

Go to `/admin` in the browser. Enter your `ADMIN_SECRET`. From there you can:

- See all queued prompts
- Change status (Queued → In Progress → Delivered)
- Upload a drawing image for any prompt
- The image saves to `public/drawings/` and shows up on the main page

Keep your `ADMIN_SECRET` private. Don't commit `.env`.

## Deploy

Works on Vercel, Netlify, Railway, or any Node host.

```bash
npm run build
npm run preview
```

## Structure

```
pages/
  index.vue       ← public landing page
  admin.vue       ← protected drawing upload panel
server/
  api/
    prompts.ts    ← GET all prompts / POST new prompt
    admin/
      upload.ts   ← PATCH status / POST drawing (secret-gated)
  data/
    prompts.json  ← prompt queue (flat file store)
public/
  drawings/       ← uploaded drawings live here
  avatar.jpg      ← your profile photo (add this)
```

## Built by

[Derrick Kempf](https://derrickkempf.com)
