# The preview harness

Renders the Aveyron theme to static HTML so it can be hosted on GitHub Pages
before the Shopify store is live.

The theme files are read **unmodified**. What you see on the preview is the
same Liquid that will run on Shopify — which is the point: a preview that
renders its own separate copy of the design proves nothing.

```bash
cd harness
npm install
npm run build -- --domain addisonemma.com   # → ../docs
```

| Flag | Default | What it does |
| --- | --- | --- |
| `--domain` | none | Writes `docs/CNAME` for a custom domain |
| `--base` | empty | Path prefix, for `user.github.io/repo` hosting |
| `--out` | `docs` | Output directory |

## How it works

`liquidjs` supplies the Liquid language; `lib/` supplies the Shopify parts it
does not have.

| File | Provides |
| --- | --- |
| `lib/filters.mjs` | `t`, `money`, `image_url`, `image_tag`, `placeholder_svg_tag`, `color_*`, `format_address`, `payment_type_svg_tag`, … |
| `lib/tags.mjs` | `{% section %}`, `{% sections %}`, `{% schema %}`, `{% paginate %}`, `{% form %}`, `{% style %}` |
| `lib/dates.mjs` | Ruby `strftime` and the locale's named date formats |
| `data/store.mjs` | The catalogue as real product / collection / article objects |
| `data/images.mjs` | Photography for `image_picker` settings |
| `runtime/demo-runtime.js` | The browser half — see below |

Two details worth knowing if you extend it:

- **Globals.** Shopify makes `settings`, `shop`, `routes` and friends visible
  inside `{% render %}`; liquidjs isolates snippet scope. The build passes
  them as liquidjs `globals`, which is what makes snippets work at all.
- **`foo?` properties.** Shopify allows `form.posted_successfully?`; liquidjs
  does not parse it. Every Liquid file is mirrored into `harness/.sources`
  with those rewritten to `foo_q`. Nothing else is touched.

## The demo runtime

GitHub Pages serves files, not Shopify. `runtime/demo-runtime.js` — loaded
**only** by the static build, never by the theme — intercepts `fetch` and
answers the endpoints the theme talks to from a product index in the page:

| Endpoint | Answered with |
| --- | --- |
| `/cart/add`, `/cart/change`, `/cart/update`, `/cart.js` | A bag in `localStorage`, plus re-rendered drawer sections |
| `/search/suggest` | Client-side search over the catalogue |
| `/recommendations/products` | Four other pieces |
| `/search?section_id=recent-results` | Recently viewed, by handle |

So the bag, predictive search, quick add, saved pieces, recommendations and
recently viewed all behave as they will on the real storefront.

## What a static host cannot do

These show a toast saying so rather than failing silently:

- **Checkout** — needs Shopify.
- **Sorting** — a static host cannot read `?sort_by=`. The category pills
  work, because they are modelled as real collections with their own pages.
- **Forms** — newsletter, contact, comments, account. They validate and
  confirm; nothing is sent.
- **Accounts** — sign in and register render, but do not authenticate.

Filtering, pagination and "Show more" all work: each collection and page is
pre-rendered, and the theme's fetch of `?section_id=…` gets the whole page
back and takes the grid out of it.

## Refreshing the preview

```bash
cd harness && npm run build -- --domain addisonemma.com
git add docs && git commit -m "Rebuild preview" && git push
```

GitHub Pages serves `main` → `/docs`.
