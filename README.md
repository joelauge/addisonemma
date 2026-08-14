# Aveyron

A Shopify theme for **Addison Emma**, built from the Claude Design project
[High-fashion ecommerce redesign](https://claude.ai/design/p/e5dbbe3c-bf37-4c69-8da2-b74413d895e4).

Online Store 2.0. No build step, no framework, no jQuery. Behaviour is a single
file of custom elements; every one of them degrades to a working link or form
when JavaScript is unavailable.

---

## Preview

A static render of this theme is hosted on GitHub Pages at
**[addisonemma.com](https://addisonemma.com)**, so the whole storefront can be
walked through before the Shopify store opens. It is `noindex` and
`Disallow: /` until you announce it.

```bash
cd harness && npm install
npm run build -- --domain addisonemma.com    # → docs/
git add docs && git commit -m "Rebuild preview" && git push
```

The harness reads these theme files unmodified — see [harness/README.md](harness/README.md).

---

## Install

```bash
shopify theme push --unpublished --store your-store.myshopify.com
```

To work on it locally:

```bash
shopify theme dev --store your-store.myshopify.com
```

Check it before you push:

```bash
shopify theme check
```

The nine remaining warnings are deliberate: seven are the Google Fonts requests
(see **Typography** below) and two are `UnusedAssign` false positives where the
linter cannot see through a multi-line `image_tag` filter chain.

---

## What the store needs

### Navigation

| Handle | Used by |
| --- | --- |
| `main-menu` | Header. Links with children render as a mega menu; grandchildren become the columns. |
| `footer` | Footer columns. |

Create a second menu for the small utility links (Services, Boutiques…) and
choose it under **Header → Utility menu**. The first two appear on desktop; all
of them appear in the mobile drawer.

### Pages

Create these pages and assign the matching template:

| Page | Template | Then |
| --- | --- | --- |
| Maison | `page.maison` | — |
| Boutiques | `page.boutiques` | — |
| Client services | `page.services` | Link from **Header → Utility menu** |
| Saved pieces | `page.saved` | Choose it under **Header → Saved pieces page** |
| Size & fit | `page` | Choose it under **Product → Colour and size → Size guide page** |
| Contact | `page.contact` | — |

**Saved pieces** renders cards for every product in the collection you choose
under its settings (default: all products) and reveals the ones the visitor has
saved. Point it at the collection that holds everything you sell.

### Product metafields

All optional — every one falls back to something sensible. Create them in the
`custom` namespace under **Settings → Custom data → Products**.

| Key | Type | Appears as | Falls back to |
| --- | --- | --- | --- |
| `material` | Single line text | The small line under a product card title | Product type |
| `reference` | Single line text | The reference beside the category on a product page | Variant SKU |
| `fit_note` | Single line text | Sits above the stock note — *"Cut generous — take one size down."* | nothing |
| `badge` | Single line text | Overrides the New / Last sizes marker on a card | computed |
| `composition` | Rich text | Product panel 1 | The panel's fixed text |
| `care` | Rich text | Product panel 2 | The panel's fixed text |
| `makers` | Rich text | Product panel 4 | The panel's fixed text |

Each detail panel names its metafield key in the theme editor; clear the key to
use fixed text for every product instead.

### Options

Name the options **Colour** (or Color) and **Size** and the theme does the rest:
colour renders as swatches, size as chips. Swatches use Shopify's own swatch
values (image or colour) when set, and otherwise read the value name as a CSS
colour — so *Chestnut* wants a swatch, but *Navy* works as-is.

Quick add on a collection card only appears for products with a Size option, or
for single-variant products.

### Filtering

Collection filters come from Shopify's **Search & Discovery** app. Install it and
add filters; the theme renders every list filter as a row of pills and updates
the grid without a page load. Price and rating filters are ignored by design —
this collection is browsed, not sifted.

---

## Typography

Three faces: a display serif, a body sans, and a mono for the small uppercase
lines. They load from Google Fonts by default, asynchronously via a print-media
swap so they never block first paint.

Theme check flags these as `RemoteAsset`, which is fair. To serve them from
Shopify's CDN instead, turn off **Typography → Load these from Google Fonts** and
add `font_picker` settings, or self-host the files in `assets/`.

---

## Structure

```
assets/
  base.css          the whole design system, tokens driven from theme settings
  theme.js          custom elements: cart, search, variants, wishlist, facets
layout/
  theme.liquid      the shell; password.liquid for the closed store
sections/
  header-group.json  announcement bar + header
  footer-group.json  newsletter + footer
  main-*.liquid      one per template
  cart-drawer.liquid a section, not a snippet, so the Cart API can re-render it
snippets/
  product-card.liquid, cart-drawer-contents.liquid, grid-style.liquid, …
```

### Custom elements

| Element | Does |
| --- | --- |
| `<cart-drawer>` | Slide-in bag, re-rendered by the Section Rendering API after every change |
| `<cart-line>` | Quantity stepper and remove, with optimistic dimming |
| `<product-form>` | Adds to the bag over AJAX, never leaving the page |
| `<variant-picker>` | Availability per option, arrow-key navigation, URL kept in sync |
| `<product-info>` | Reacts to a variant change: price, stock note, button, gallery |
| `<buy-bar>` | The bar that follows you down a product page on a phone |
| `<quick-add>` | Size picker over a collection card |
| `<search-panel>` | Predictive search with `↑ ↓ Enter Esc` |
| `<facet-form>` | Filters and sorting without a page load |
| `<load-more>` | Appends the next page; the real paginated link stays underneath |
| `<wishlist-button>` `<wishlist-grid>` | Saved pieces, in the visitor's own browser |
| `<recently-viewed>` | Fetched from the search endpoint on demand |
| `<image-zoom>` | Click a product shot to enlarge it |
| `<toast-shelf>` | One `aria-live` region for the whole site |

---

## Notes on the details

**Motion.** Everything is skipped for visitors whose system asks for reduced
motion — reveals, the hero's slow zoom, the card cross-fade, page transitions.

**Scrolling.** `overflow-x` is deliberately absent from `<body>`. With
`overflow-y` left visible it computes to the same value and propagates to the
viewport, which stops the page scrolling entirely. Sections that can overflow
clip themselves instead.

**Grid columns.** `snippets/grid-style.liquid` emits desktop, tablet and mobile
counts as three separate custom properties. The media queries switch which one
they read rather than trying to override an inline value, which they would
always lose.

**Contrast.** The hero scrim is deepest at the foot and gone by two-thirds, and
card badges sit on a small paper chip. Merchants upload their own photographs;
olive type on a dark coat is unreadable.

**Speed.** Fonts load async, hero images are `fetchpriority="high"`, everything
else is lazy with a real `srcset`, and links are prefetched on hover through
speculation rules.
