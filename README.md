# ACE Rebrand

Public website prototype for ACE — AI Deployment Co.

Live preview: https://ace-rebrand.vercel.app

Static HTML, CSS and JS. No build step, no dependencies, no framework.

## Run locally

Open `index.html` directly, or serve the directory with any static file server.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Home page structure, copy and social metadata |
| `company.html` | Case Studies, Fulfillment Partner, Our Story |
| `partners.html` | Partner Program |
| `terms.html`, `privacy.html` | Legal documents, effective 3 August 2026 |
| `styles.css` | Responsive visual system |
| `script.js` | Mobile navigation and scroll reveals |
| `assets/ace-white-logomark.png` | ACE logomark |
| `assets/favicon.png`, `assets/apple-touch-icon.png` | Tab and home-screen icons |
| `assets/og-cover.png` | 1200×630 link preview card |
| `assets/og-cover.source.html` | Build source for the card above |
| `.vercelignore` | Keeps internal design docs off the public deployment |

## Shared chrome

The header and footer are **duplicated in every page** rather than templated.
This is a static site with no build step, and a toolchain is not worth it for
five pages. The trade is that a nav or footer change has to be made in all five.
Inner pages differ in one way only: in-page anchors are `/#services` rather than
`#services`, because a bare hash would resolve against the current page.

## Design brief

The governing brief is the 2026-08-20 ICP-psychology override, summarised in
`oxide-reference-lock.md`. Two rules it is easy to break by accident:

- **Green is semantic.** It marks a genuine measured positive outcome and
  nothing else. It currently appears in two text nodes on the whole site.
  Copper `--copper` is the brand signature; blue-grey `--info` carries
  architecture and connectors.
- **No looping motion.** Reveals only. Figures, security statements and calls to
  action never animate. Diagram strokes may draw once. There are zero elements
  with `animation-iteration-count: infinite` and it should stay that way.

## Home page order

Hero, proof strip, method, engagements, selected deployments, verticals,
judgment stays human, assurance, CTA. The order is psychological, not
editorial: relevance, then value, then proof, then method, then control, then
execution. Moving proof later undoes the point of the rebuild.

## Hero

Two columns: copy left, layer architecture right, with the vertical strip
spanning both underneath. The diagram exists to answer the integration
objection — ACE sits on top of the systems a firm already runs — not to
demonstrate technical range. It is HTML and CSS, no images, no canvas, no JS.

## Claims

Every figure on the site comes from a real engagement and is traceable to
`projects/ace-case-study-deck/source.md`. The one illustrative element, the
value-case table, is labelled illustrative in its own caption. The assurance
section makes no certification claim. Do not add a figure that cannot be
evidenced — this audience checks.

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
