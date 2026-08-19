# ACE Rebrand

Public website prototype for ACE — AI Deployment Co.

Live preview: https://ace-rebrand.vercel.app

Static HTML, CSS and JS. No build step, no dependencies, no framework.

## Run locally

Open `index.html` directly, or serve the directory with any static file server.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Page structure, copy and social metadata |
| `styles.css` | Responsive visual system |
| `script.js` | Mobile navigation and scroll reveals |
| `assets/ace-white-logomark.png` | ACE logomark |
| `assets/favicon.png`, `assets/apple-touch-icon.png` | Tab and home-screen icons |
| `assets/og-cover.png` | 1200×630 link preview card |
| `assets/og-cover.source.html` | Build source for the card above |
| `.vercelignore` | Keeps internal design docs off the public deployment |

## Hero schematic

The hero's right column is the deployment path: four stages on a single spine,
with a signal pulse travelling it on a 7-second loop. It is drawn entirely in
CSS — no images, no canvas, no invented dashboard data. The pulse is hidden
under `prefers-reduced-motion`.

Stage spacing is driven by one custom property, `--row` on `.path-wrap`, which
each breakpoint retunes. The spine derives its length from that same value, so
the two never drift apart.

## Regenerating the link preview card

Edit `assets/og-cover.source.html`, then re-render at exactly 1200×630:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=6000 \
  --window-size=1200,630 --screenshot=assets/og-cover.png assets/og-cover.source.html
```

## Deploying

```sh
vercel deploy --prod --yes
```

`.vercelignore` excludes the design docs, concept boards and unused assets that
sit alongside the site in the working directory. Keep it current when adding internal files.

## Note on absolute URLs

`index.html` hard-codes `https://ace-rebrand.vercel.app/` in the canonical link
and the Open Graph tags. Update those when the production domain is attached,
otherwise link previews will keep pointing at the preview deployment.
