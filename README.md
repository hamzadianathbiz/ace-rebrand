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

## Design system

Tokens, type and geometry live at the top of `styles.css`. Three primitives
carry the identity and are easy to break by accident:

- **Vermilion `--accent`** is oxidised steel, not brand red. Marks, rules,
  ordinals and one hover state. `--accent` measures 4.39:1 on the page, so any
  accent text below 24px must use `--accent-hover` instead.
- **The notch** — `.notch`, `.notch-sm`, `.notch-frame` — is a diagonal clipped
  corner taken from the ACE mark. Used sparingly so it reads as a signature.
  `.notch-frame` exists because `clip-path` also clips a border; it draws the
  hairline as a 1px background behind the clipped child.
- **Mono is metadata.** Section IDs, annotations, small labels. It sits at
  roughly 20% of visible characters. Anything a person reads in a sentence is
  set in Schibsted Grotesk.

`--steel` is `#80868e`, not the `#626870` the brief specified: that value
measures 3.41:1 and fails AA for the small metadata it carries.

## Home page order

Nav, hero, methodology, engagements, selected deployments, verticals,
assurance, CTA, footer. Selected deployments is the one light editorial
interruption — it inverts the tokens locally on `.results` rather than needing
a separate stylesheet. Do not add a second light section.

## Motion

Reveals and connector draws only. No loops anywhere: verified as zero elements
with `animation-iteration-count: infinite`. Figures, security statements and
calls to action never animate. All of it collapses under
`prefers-reduced-motion`.

## Photography

Two images, both from the previous ACE site, reprocessed by the script pattern
in the session log: heavy desaturation, a duotone from ink black to warm bone,
a trace of vermilion in the upper mids, then darkened. Regenerate them the same
way if they are ever replaced, or the photography will stop matching the
interface.

## Claims

Every figure is traceable to `projects/ace-case-study-deck/source.md`. The two
illustrative visuals (the diagnostic workflow map and the prioritisation table)
say so in their own captions. The assurance section states certification status
plainly and claims nothing else.

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
