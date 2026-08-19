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

## Hero background

The hero's visual is a four-panel rail below the copy: Diagnostic, AI
Opportunity, Blueprint, Deployment. Each panel is an Oxide-style console
surface — 1px border, carbon fill, mono label with an icon and a caret — and
each carries content specific to its stage. Green connectors run between them.

It is drawn entirely in HTML and CSS. No images, no canvas, no JS. The build
sequence autoplays once on load and holds its finished state; the only looping
motion is the deployment throughput trace. Under `prefers-reduced-motion` every
animation collapses to its end state, so a reduced-motion visitor sees the
finished composition immediately.

The stage timeline lives in `styles.css` as explicit `animation-delay` values on
`.stage`, `.matrix`, `.opp-row`, `.code span` and `.ship-row`. Changing the pace
means retuning those delays together — they are a single sequence, not
independent effects.

## Section animations

Services, Verticals and Security each animate on scroll, driven by the
`.is-visible` class the `IntersectionObserver` in `script.js` already applies to
`.reveal` elements. No extra JS: the observer sets the class, CSS does the rest.

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
