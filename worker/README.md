# Daily Bytes Worker

Cloudflare Worker that holds the Gemini and DigitalOcean Spaces credentials
server-side and exposes two endpoints for the React app:

- `POST /generate` — `{ prompt, day, valSelect }` → calls Gemini, returns `{ html, json }`
- `POST /upload` — `{ date, json }` → uploads to DigitalOcean Spaces, returns `{ success, file }`

Secrets never touch the frontend bundle — only this Worker sees them.

## Setup

```sh
cd worker
npm install
npx wrangler login

npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put DO_SPACES_KEY
npx wrangler secret put DO_SPACES_SECRET
```

## Local development

```sh
npm run dev
```

Runs on `http://localhost:8787` by default, matching the frontend's default
`VITE_WORKER_URL`.

## Deploy

```sh
npm run deploy
```

Wrangler prints the deployed Worker URL (e.g.
`https://ca-admin-daily-bytes.<your-subdomain>.workers.dev`). Set that as
`VITE_WORKER_URL` in the frontend's `.env` before building.

If you rename the Worker or use a custom domain, also update
`ALLOWED_ORIGIN` in `wrangler.toml` to match the origin the frontend is
served from.
