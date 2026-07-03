# Existable — toybox site

Single-page site for existable.com. Four themed sections (Home / Education / Applications / Games), each with its own background texture, fonts, interactive tessellation logo (cursor physics), and a live card feed pulled from Airtable.

## Structure

```
index.html      the whole site (markup + logic)
support.js      runtime the page depends on — deploy as-is, don't edit
assets/         tessellation SVGs, background textures, Region Xentrix font
api/feed.js     Vercel serverless function that proxies Airtable (keeps token secret)
.env.example    template for local env vars
```

## Deploy (Vercel)

1. Push this folder to a GitHub repo (repo root = this folder).
2. Import the repo in Vercel — zero config: static files served from root, `api/` becomes serverless functions automatically. No build step, no framework preset (choose "Other").
3. In Vercel → Project → Settings → Environment Variables, add:
   - `AIRTABLE_TOKEN` = your personal access token (scope `data.records:read`, access limited to the Existable base)
4. Deploy. Every push to `main` redeploys.

## Local development

```
cp .env.example .env       # then paste your token into .env
npm i -g vercel            # if you don't have it
vercel dev                 # serves the site + /api/feed on localhost
```

Opening `index.html` directly from disk will render the site but the feed will show an error, since `/api/feed` only exists under `vercel dev` or on Vercel.

## Content

All cards come from the Airtable base (table columns: `Title`, `Blurb`, `Category`, `Link`, `Image`). `Category` must be one of Home / Education / Applications / Games (any capitalization). Edit rows in Airtable and the site updates on next page load — no redeploy needed. The `/api/feed` responses are edge-cached for 60 seconds.

## Notes

- If you rotate the Airtable token, just update the `AIRTABLE_TOKEN` env var in Vercel — no code change.
- `Image` can be an Airtable attachment or a URL string; both work. Rows without an image get a striped placeholder.
