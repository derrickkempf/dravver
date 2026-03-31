# dravver

A drawing engine for [Derrick Kempf](https://www.derrickkempf.com). A satirical fork of [vvriter](https://github.com/visualizevalue/vvriter).

You type the prompt. I draw it. By hand. You'll get it when you get it.

---

## Why

AI is generating graphics whether we participate or not. So we built the alternative — one input field, one human, and a response time that is best described as "organic." The output looks like Derrick Kempf because it's made by Derrick Kempf.

No API. No model. No latency optimizations.

Just a guy with a pen.

---

## How It Works

Two modes:

### Mode 1: Prompt → Drawing

1. Submit your prompt
2. It gets added to the queue
3. The queue is a notebook on a desk
4. The notebook gets drawn from at some point
5. You receive the drawing at an undefined later date
6. The drawing is real. Made by hand. Yours.

This is not a bug. This is the feature. The feature is a human being.

### Mode 2: VV → Derrick Kempf

Pulls from the Visualize Value visual library — 400+ black-and-white graphics built on boxes, arrows, and compressed ideas — and remakes them in the Derrick Kempf illustration style.

Same concept. Different hand. The box becomes a sketch. The arrow gets a little wobbly. The insight stays.

The original said something with geometry. This version says the same thing but it looks like someone drew it while thinking about it, which is because someone did.

---

## Install

```
submit a prompt
wait
```

No `npx`. No config file. No MCP server.

You can add it to Claude Desktop if you want. It won't do anything. Claude doesn't have my hands.

---

## Setup (for development)

```bash
cp .env.example .env
# fill in ADMIN_SECRET and BLOB_READ_WRITE_TOKEN

npm install
npm run dev
```

---

## Deploy to Vercel

### 1. Add environment variables

In Vercel → your project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `ADMIN_SECRET` | a secret only you know |
| `BLOB_READ_WRITE_TOKEN` | from Vercel Blob (see step 2) |

### 2. Set up Vercel Blob (for image uploads)

Vercel's filesystem is read-only in production, so drawings are stored in Vercel Blob — a simple, free object store.

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → **Storage** tab
2. Click **Create** → choose **Blob**
3. Name it `dravver-drawings` (or anything)
4. Click **Connect to Project** and select your dravver project
5. Go to the Blob store → **.env.local** tab → copy `BLOB_READ_WRITE_TOKEN`
6. Paste it into your Vercel environment variables

### 3. Set build settings

In Vercel → **Settings → General → Build & Development Settings**:

- **Framework Preset**: `Nuxt.js`
- **Build Command**: `npm run build`
- **Install Command**: `npm install`

### 4. Redeploy

Push any change to `main` or hit **Redeploy** in the Vercel dashboard. It should build clean.

---

## Admin: uploading drawings

Go to `/admin` in your browser. Enter your `ADMIN_SECRET`. From there you can:

- See all queued prompts
- Update status: Queued → In Progress → Delivered
- Upload a finished drawing — it goes straight to Vercel Blob and shows up on the main page

Keep your `ADMIN_SECRET` private. Don't commit `.env`.

---

## Delivery

Delivery times vary. Factors include:

- Queue depth
- Complexity of prompt
- Whether the prompt made me laugh
- Whether I'm traveling
- General life circumstances

Prompts that are funnier tend to get drawn faster. This is not a policy. It's just how it works.

---

## Output

Drawings are delivered digitally. They look handmade because they are handmade. They are made in the Derrick Kempf style, which means:

- Loose lines
- Characters that are doing something
- Usually a little bit funny
- The idea is in there somewhere

---

## What to Submit

Good prompts tend to be concepts, not scenes. Think VV-style: one idea, compressed. The drawing will interpret it.

**Works well:**
- "Sell your sawdust"
- "Build once, sell twice"
- "The moat is the person"
- "Consistency beats intensity"

**Also works:**
- Anything that made you stop scrolling
- A thing you keep meaning to explain to someone
- An idea you haven't figured out how to say yet

**Less useful:**
- "Draw my cat"
- Extremely detailed scenes with specific lighting requirements
- Anything that needs to be done by Tuesday

---

## Adding your photo

Drop `avatar.jpg` into the `public/` folder. It shows up in the "meet your agent" circle at the bottom.

---

## Project structure

```
pages/
  index.vue             ← public landing page
  admin.vue             ← protected drawing upload panel
server/
  api/
    prompts.ts          ← GET all prompts / POST new prompt
    admin/
      upload.ts         ← PATCH status / POST drawing (secret-gated, Vercel Blob)
  data/
    prompts.json        ← seed data / local fallback
assets/
  main.css              ← global styles
public/
  drawings/             ← local drawings (dev only; prod uses Vercel Blob)
  avatar.jpg            ← your photo (add this)
```

---

## Relationship to vvriter

vvriter generates articles from Jack Butcher's archive using an MCP server and 50,000 tweets.

dravver generates drawings from a single input field and one person's interpretation of it.

The architecture is different. The spirit is similar. The turnaround time is not comparable and we ask that you not compare them.

---

## Built by

[Derrick Kempf](https://www.derrickkempf.com)

## License

MIT. The drawings are mine until they're yours.
