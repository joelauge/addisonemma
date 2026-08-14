#!/usr/bin/env node
/**
 * Renders the Aveyron theme to static HTML for GitHub Pages.
 *
 *   node build.mjs                       → docs/, served from the domain root
 *   node build.mjs --base /aveyron       → docs/, served from a project path
 *   node build.mjs --domain shop.example → also writes docs/CNAME
 *
 * The theme files are read unmodified. Anything that needs a Shopify server
 * at runtime — the cart, predictive search, recommendations — is answered by
 * harness/runtime/demo-runtime.js in the browser instead.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';

import { registerFilters } from './lib/filters.mjs';
import {
  schemaTag, layoutTag, styleTag, javascriptTag,
  makeSectionTags, makeFormTag, paginateTag, readSchema
} from './lib/tags.mjs';
import { buildStore } from './data/store.mjs';
import { imageFor } from './data/images.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THEME = path.resolve(HERE, '..');
const CACHE = path.join(HERE, '.sources');

/**
 * Shopify allows `foo?` as a property name; liquidjs does not. Mirror every
 * Liquid file into a cache with those rewritten to `foo_q`, and point the
 * engine at the mirror. Nothing else about the source is touched.
 */
function normaliseSource(source) {
  return source.replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, (chunk) =>
    // Only outside string literals. A `?` inside a quoted string is content —
    // rewriting it turned `css2?family=` into `css2_qfamily=` in the Google
    // Fonts URL, which 404'd and silently dropped every webface on the site.
    chunk.replace(/'[^']*'|"[^"]*"|\b([A-Za-z_]\w*)\?/g, (match, ident) =>
      ident ? `${ident}_q` : match
    )
  );
}

function mirrorSources() {
  fs.rmSync(CACHE, { recursive: true, force: true });
  for (const dir of ['sections', 'snippets', 'layout', 'templates']) {
    const from = path.join(THEME, dir);
    if (!fs.existsSync(from)) continue;
    for (const entry of fs.readdirSync(from, { withFileTypes: true, recursive: true })) {
      if (!entry.isFile()) continue;
      const rel = path.relative(THEME, path.join(entry.parentPath || entry.path, entry.name));
      const target = path.join(CACHE, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const body = fs.readFileSync(path.join(THEME, rel), 'utf8');
      fs.writeFileSync(target, rel.endsWith('.liquid') ? normaliseSource(body) : body);
    }
  }
}
mirrorSources();

/* --- Arguments ---------------------------------------------------------- */

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const BASE = (arg('base', '') || '').replace(/\/$/, '');
const DOMAIN = arg('domain');
const OUT = path.resolve(THEME, arg('out', 'docs'));

/* --- Theme settings ----------------------------------------------------- */

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const settingsSchema = readJSON(path.join(THEME, 'config/settings_schema.json'));
const settingsData = readJSON(path.join(THEME, 'config/settings_data.json'));

const settings = {};
for (const group of settingsSchema) {
  for (const setting of group.settings || []) {
    if (setting.id !== undefined && setting.default !== undefined) settings[setting.id] = setting.default;
  }
}
Object.assign(settings, settingsData.current);
delete settings.sections;

const locale = readJSON(path.join(THEME, 'locales/en.default.json'));
const dateFormats = locale.date_formats || {};

/* --- Store -------------------------------------------------------------- */

const store = buildStore(BASE);

const shop = {
  name: 'Addison Emma',
  description: 'Clothes for the hours that are not accounted for. Made in the Aveyron since 1908.',
  url: DOMAIN ? `https://${DOMAIN}` : 'https://addisonemma.example',
  secure_url: DOMAIN ? `https://${DOMAIN}` : 'https://addisonemma.example',
  email: 'bonjour@addisonemma.example',
  currency: 'EUR',
  money_format: '${{amount_no_decimals}}',
  customer_accounts_enabled: true,
  enabled_payment_types: ['visa', 'master', 'american_express', 'paypal', 'apple_pay'],
  assetBase: `${BASE}/assets/`
};

const routes = {
  root_url: `${BASE}/`,
  all_products_collection_url: `${BASE}/collections/all/`,
  collections_url: `${BASE}/collections/`,
  cart_url: `${BASE}/cart/`,
  cart_add_url: `${BASE}/cart/add`,
  cart_change_url: `${BASE}/cart/change`,
  cart_update_url: `${BASE}/cart/update`,
  search_url: `${BASE}/search`,
  predictive_search_url: `${BASE}/search/suggest`,
  product_recommendations_url: `${BASE}/recommendations/products`,
  account_url: `${BASE}/account/`,
  account_login_url: `${BASE}/account/login/`,
  account_logout_url: `${BASE}/account/`,
  account_register_url: `${BASE}/account/register/`,
  account_addresses_url: `${BASE}/account/addresses/`
};

const link = (title, url, links = []) => ({
  title, url, links,
  active: false,
  child_active: false,
  type: 'http_link',
  object: null
});

const linklists = {
  'main-menu': {
    title: 'Main menu',
    links: [
      link('Collection', `${BASE}/collections/all/`, [
        link('Ready to wear', '#', [
          link('Outerwear', `${BASE}/collections/outerwear/`),
          link('Knitwear', `${BASE}/collections/knitwear/`),
          link('Dresses', `${BASE}/collections/dresses/`),
          link('Trousers', `${BASE}/collections/trousers/`),
          link('Blouses', `${BASE}/collections/blouses/`)
        ]),
        link('Leather & objects', '#', [
          link('Everything in leather', `${BASE}/collections/leather/`),
          link('Bags', `${BASE}/collections/leather/`),
          link('Boots', `${BASE}/collections/leather/`),
          link('Gloves', `${BASE}/collections/leather/`)
        ]),
        link('The collection', '#', [
          link('Autumn — Winter 2026', `${BASE}/collections/all/`),
          link('The archive', `${BASE}/pages/maison/`),
          link('Made to measure', `${BASE}/pages/services/`)
        ])
      ]),
      link('Maison', `${BASE}/pages/maison/`),
      link('Journal', `${BASE}/blogs/journal/`),
      link('Boutiques', `${BASE}/pages/boutiques/`)
    ]
  },
  footer: {
    title: 'Footer',
    links: [
      link('Our story', `${BASE}/pages/maison/`),
      link('The atelier', `${BASE}/pages/maison/`),
      link('Fabrics', `${BASE}/blogs/journal/a-morning-at-the-mill/`),
      link('Boutiques', `${BASE}/pages/boutiques/`),
      link('Services', `${BASE}/pages/services/`),
      link('Contact', `${BASE}/pages/contact/`),
      link('Size & fit', `${BASE}/pages/size-fit/`)
    ]
  },
  utility: {
    title: 'Utility',
    links: [link('Services', `${BASE}/pages/services/`), link('Boutiques', `${BASE}/pages/boutiques/`)]
  }
};

const emptyCart = {
  item_count: 0,
  items: [],
  total_price: 0,
  items_subtotal_price: 0,
  original_total_price: 0,
  total_discount: 0,
  note: '',
  attributes: {},
  currency: { iso_code: shop.currency },
  cart_level_discount_applications: []
};

/* --- The engine --------------------------------------------------------- */

const failures = [];
let currentTemplate = 'index';

const engine = new Liquid({
  root: [path.join(CACHE, 'snippets'), path.join(CACHE, 'sections'), CACHE],
  extname: '.liquid',
  jsTruthy: true,
  relativeReference: false,
  strictFilters: false,
  strictVariables: false,
  greedy: false
});

registerFilters(engine, { locale, shop, dateFormats });

/** Section settings: schema defaults, then whatever the JSON template says. */
function defaultsFor(list = []) {
  const out = {};
  for (const item of list) {
    if (item.id !== undefined && item.default !== undefined) out[item.id] = item.default;
  }
  return out;
}

/** `shopify://pages/services` resolves to a page object, or to its URL. */
function resolveShopifyUrl(value, wantUrl) {
  const page = value.match(/^shopify:\/\/pages\/(.+?)\/?$/);
  if (page) {
    const resolved = store.pages[page[1]] || { url: `${BASE}/pages/${page[1]}/`, title: page[1] };
    return wantUrl ? resolved.url : resolved;
  }
  const collection = value.match(/^shopify:\/\/collections\/(.+?)\/?$/);
  if (collection) {
    const resolved = store.collections.find((c) => c.handle === collection[1]) || null;
    return wantUrl ? resolved?.url || `${BASE}/collections/${collection[1]}/` : resolved;
  }
  const blog = value.match(/^shopify:\/\/blogs\/(.+?)\/?$/);
  if (blog) return wantUrl ? store.blog.url : store.blog;
  return value;
}

/** Turns a setting id into a live object where the schema says so. */
function hydrateSettings(schemaSettings = [], values, where = {}) {
  const out = { ...values };
  for (const setting of schemaSettings) {
    let raw = out[setting.id];

    // A `url` setting stays a string; a `page`/`collection` setting becomes an object.
    if (typeof raw === 'string' && raw.startsWith('shopify://')) {
      raw = resolveShopifyUrl(raw, setting.type === 'url');
      out[setting.id] = raw;
    }

    if (setting.type === 'link_list') {
      out[setting.id] = linklists[raw] || linklists[setting.default] || { links: [] };
    } else if (setting.type === 'collection') {
      out[setting.id] =
        (typeof raw === 'string' && store.collections.find((c) => c.handle === raw)) ||
        (raw && typeof raw === 'object' ? raw : null);
    } else if (setting.type === 'blog') {
      out[setting.id] = store.blog;
    } else if (setting.type === 'page') {
      out[setting.id] = typeof raw === 'string' ? store.pages[raw] || null : raw || null;
    } else if (setting.type === 'image_picker') {
      out[setting.id] =
        (raw && typeof raw === 'object' ? raw : null) ||
        imageFor({ ...where, settingId: setting.id, template: currentTemplate });
    }
  }
  return out;
}

function buildSectionContext({ type, id: sectionId, config, schema }) {
  const values = { ...defaultsFor(schema.settings), ...(config?.settings || {}) };
  const settingsResolved = hydrateSettings(schema.settings, values, { sectionId, sectionType: type });

  const blockDefs = Object.fromEntries((schema.blocks || []).map((b) => [b.type, b]));
  const order = config?.block_order || Object.keys(config?.blocks || {});
  const blocks = order
    .map((blockId) => {
      const block = config.blocks[blockId];
      if (!block) return null;
      const def = blockDefs[block.type] || {};
      const blockValues = { ...defaultsFor(def.settings), ...(block.settings || {}) };
      return {
        id: blockId,
        type: block.type,
        settings: hydrateSettings(def.settings, blockValues, { sectionId, sectionType: type, blockId }),
        shopify_attributes: ''
      };
    })
    .filter(Boolean);

  return { id: sectionId, type, settings: settingsResolved, blocks, index: 0, location: 'template' };
}

const { sectionTag, sectionsTag } = makeSectionTags({
  themeDir: CACHE,
  onError: (type, error) => failures.push({ type, message: error.message }),
  buildSectionContext
});

engine.registerTag('schema', schemaTag);
engine.registerTag('layout', layoutTag);
engine.registerTag('style', styleTag);
engine.registerTag('javascript', javascriptTag);
engine.registerTag('section', sectionTag);
engine.registerTag('sections', sectionsTag);
engine.registerTag('paginate', paginateTag);
engine.registerTag('form', makeFormTag({ formAction: () => `${BASE}/` }));

const loadTemplate = (file) => fs.readFileSync(file, 'utf8');

/* --- Rendering a page --------------------------------------------------- */

const layoutSource = () => loadTemplate(path.join(CACHE, 'layout/theme.liquid'));

async function renderTemplate(templateName, scope) {
  const jsonPath = path.join(CACHE, 'templates', `${templateName}.json`);
  const liquidPath = path.join(CACHE, 'templates', `${templateName}.liquid`);

  if (fs.existsSync(jsonPath)) {
    const template = readJSON(jsonPath);
    const order = template.order || Object.keys(template.sections);
    let html = '';
    for (const sectionId of order) {
      const config = template.sections[sectionId];
      if (!config) continue;
      html += await engine.parseAndRender(
        `{% section_inline %}`,
        { ...scope, __inline: { type: config.type, id: sectionId, config } },
        { globals: scope }
      );
    }
    return html;
  }

  if (fs.existsSync(liquidPath)) return engine.parseAndRender(loadTemplate(liquidPath), scope, { globals: scope });
  throw new Error(`no template: ${templateName}`);
}

// A tiny tag so template JSON sections go through the same path as {% section %}.
engine.registerTag('section_inline', {
  parse() {},
  *render(ctx) {
    const spec = ctx.getSync(['__inline']);
    const file = path.join(CACHE, 'sections', `${spec.type}.liquid`);
    if (!fs.existsSync(file)) return `<!-- missing section: ${spec.type} -->`;
    const source = fs.readFileSync(file, 'utf8');
    const schema = readSchema(source);

    const section = buildSectionContext({ ...spec, schema });
    let rendered;
    try {
      const scope = ctx.getAll();
      rendered = yield engine.parseAndRender(source, { ...scope, section }, { globals: { ...scope, section } });
    } catch (error) {
      failures.push({ type: spec.type, message: error.message });
      rendered = `<!-- section ${spec.type} failed: ${String(error.message).slice(0, 300)} -->`;
    }
    const tag = schema.tag || 'div';
    const cls = ['shopify-section', schema.class].filter(Boolean).join(' ');
    return `<${tag} id="shopify-section-${spec.id}" class="${cls}">${rendered}</${tag}>`;
  }
});

async function renderPage({ template, scope, title, description }) {
  const context = {
    settings,
    shop,
    routes,
    linklists,
    linklist: linklists,
    cart: emptyCart,
    customer: null,
    canonical_url: `${shop.url}${scope.__path || '/'}`,
    page_title: title,
    page_description: description || shop.description,
    current_page: scope.current_page || 1,
    current_tags: null,
    template: { name: template, suffix: null },
    request: {
      page_type: scope.__pageType || template,
      locale: { iso_code: 'en' },
      origin: shop.url,
      path: scope.__path || '/',
      host: DOMAIN || 'addisonemma.example'
    },
    localization: {
      available_countries: [{ iso_code: 'FR', name: 'France', currency: { iso_code: 'EUR' } }],
      available_languages: [{ iso_code: 'en', endonym_name: 'English' }],
      country: { iso_code: 'FR', name: 'France' },
      language: { iso_code: 'en' }
    },
    content_for_header: '',
    powered_by_link: '',
    additional_checkout_buttons: false,
    content_for_additional_checkout_buttons: '',
    country_option_tags: '<option value="France">France</option>',
    recommendations: { performed: false, products: [], products_count: 0 },
    predictive_search: { performed: false, resources: {} },
    search: { performed: false, terms: '', results: [], results_count: 0 },
    ...scope
  };

  currentTemplate = template;
  const body = await renderTemplate(template, context);
  const html = await engine.parseAndRender(
    layoutSource(),
    { ...context, content_for_layout: body },
    { globals: context }
  );
  return injectDemoRuntime(html);
}

/**
 * Adds the demo runtime, and keeps the preview out of search results. This is
 * a pre-announcement staging site on a public repo; it should not be indexed.
 * The noindex lives here, in the harness, never in the theme itself.
 */
function injectDemoRuntime(html) {
  const withMeta = html.replace(
    '<meta charset="utf-8">',
    '<meta charset="utf-8">\n    <meta name="robots" content="noindex, nofollow">'
  );
  const tags =
    `\n<script>window.__DEMO_BASE=${JSON.stringify(BASE)};</script>` +
    `\n<script src="${BASE}/assets/demo-products.js"></script>` +
    `\n<script src="${BASE}/assets/demo-runtime.js" defer></script>\n`;
  return withMeta.replace('</body>', `${tags}</body>`);
}

/* --- Routes ------------------------------------------------------------- */

const written = [];

function write(routePath, html) {
  const rel = routePath === '/404.html' ? '404.html' : path.join(routePath.replace(/^\//, ''), 'index.html');
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.push(routePath);
}

function paginationFor(items, perPage, page, urlFor) {
  const pages = Math.max(1, Math.ceil(items / perPage));
  const parts = [];
  for (let p = 1; p <= pages; p += 1) parts.push({ title: String(p), url: urlFor(p), is_link: p !== page });
  return {
    items,
    current_page: page,
    current_offset: (page - 1) * perPage,
    pages,
    page_size: perPage,
    parts,
    previous: page > 1 ? { title: 'Previous', url: urlFor(page - 1), is_link: true } : null,
    next: page < pages ? { title: 'Next', url: urlFor(page + 1), is_link: true } : null
  };
}

async function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // Assets
  const assetsOut = path.join(OUT, 'assets');
  fs.mkdirSync(assetsOut, { recursive: true });
  for (const file of fs.readdirSync(path.join(THEME, 'assets'))) {
    fs.copyFileSync(path.join(THEME, 'assets', file), path.join(assetsOut, file));
  }
  fs.copyFileSync(path.join(HERE, 'runtime/demo-runtime.js'), path.join(assetsOut, 'demo-runtime.js'));

  // A product index the demo runtime searches and renders cards from.
  fs.writeFileSync(
    path.join(assetsOut, 'demo-products.js'),
    'window.__DEMO_PRODUCTS = ' + JSON.stringify(productIndex(), null, 0) + ';\n'
  );

  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(
    path.join(OUT, 'robots.txt'),
    '# Preview of an unannounced storefront.\nUser-agent: *\nDisallow: /\n'
  );
  if (DOMAIN) fs.writeFileSync(path.join(OUT, 'CNAME'), `${DOMAIN}\n`);

  /* Home */
  write('/', await renderPage({
    template: 'index',
    title: 'Addison Emma — The Long Afternoon',
    scope: { __path: '/', __pageType: 'index' }
  }));

  /* Collections */
  write('/collections', await renderPage({
    template: 'list-collections',
    title: 'Collections',
    scope: { __path: '/collections/', __pageType: 'list-collections', collections: store.collections }
  }));

  const PER_PAGE = 9;
  for (const collection of store.collections) {
    const all = collection.products;
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    for (let page = 1; page <= pages; page += 1) {
      const urlFor = (p) => (p === 1 ? `${BASE}/collections/${collection.handle}/` : `${BASE}/collections/${collection.handle}/page/${p}/`);
      const slice = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      const scoped = { ...collection, products: slice };
      const routePath = page === 1 ? `/collections/${collection.handle}` : `/collections/${collection.handle}/page/${page}`;

      write(routePath, await renderPage({
        template: 'collection',
        title: `${collection.title} — Addison Emma`,
        description: String(collection.description).replace(/<[^>]+>/g, ''),
        scope: {
          __path: `${routePath}/`,
          __pageType: 'collection',
          collection: scoped,
          current_page: page,
          __pagination: paginationFor(all.length, PER_PAGE, page, urlFor)
        }
      }));
    }
  }

  /* Products */
  for (const product of store.products) {
    write(`/products/${product.handle}`, await renderPage({
      template: 'product',
      title: `${product.title} — Addison Emma`,
      description: String(product.description).replace(/<[^>]+>/g, '').slice(0, 200),
      scope: {
        __path: `/products/${product.handle}/`,
        __pageType: 'product',
        product,
        collection: null,
        recommendations: {
          performed: true,
          products: store.products.filter((p) => p.handle !== product.handle).slice(0, 4),
          products_count: 4
        }
      }
    }));
  }

  /* Pages */
  for (const [handle, page] of Object.entries(store.pages)) {
    const suffix = ['maison', 'boutiques', 'services', 'saved', 'contact'].includes(handle) ? `.${handle}` : '';
    const template = fs.existsSync(path.join(CACHE, 'templates', `page${suffix}.json`)) ? `page${suffix}` : 'page';
    write(`/pages/${handle}`, await renderPage({
      template,
      title: `${page.title} — Addison Emma`,
      scope: { __path: `/pages/${handle}/`, __pageType: 'page', page }
    }));
  }

  /* Journal */
  const blogPages = Math.max(1, Math.ceil(store.blog.articles.length / 7));
  for (let page = 1; page <= blogPages; page += 1) {
    const urlFor = (p) => (p === 1 ? `${BASE}/blogs/journal/` : `${BASE}/blogs/journal/page/${p}/`);
    const slice = store.blog.articles.slice((page - 1) * 7, page * 7);
    const routePath = page === 1 ? '/blogs/journal' : `/blogs/journal/page/${page}`;
    write(routePath, await renderPage({
      template: 'blog',
      title: `${store.blog.title} — Addison Emma`,
      scope: {
        __path: `${routePath}/`,
        __pageType: 'blog',
        blog: { ...store.blog, articles: slice },
        current_page: page,
        __pagination: paginationFor(store.blog.articles.length, 7, page, urlFor)
      }
    }));
  }

  for (const article of store.blog.articles) {
    write(`/blogs/journal/${article.handle}`, await renderPage({
      template: 'article',
      title: `${article.title} — Addison Emma`,
      description: article.excerpt,
      scope: {
        __path: `/blogs/journal/${article.handle}/`,
        __pageType: 'article',
        article,
        blog: store.blog
      }
    }));
  }

  /* Search, cart, accounts, 404 */
  write('/search', await renderPage({
    template: 'search',
    title: 'Search — Addison Emma',
    scope: { __path: '/search/', __pageType: 'search', search: { performed: false, terms: '', results: [], results_count: 0 } }
  }));

  write('/cart', await renderPage({
    template: 'cart',
    title: 'Your bag — Addison Emma',
    scope: { __path: '/cart/', __pageType: 'cart' }
  }));

  for (const [route, template, title] of [
    ['/account/login', 'customers/login', 'Sign in'],
    ['/account/register', 'customers/register', 'Create an account']
  ]) {
    write(route, await renderPage({
      template,
      title: `${title} — Addison Emma`,
      scope: { __path: `${route}/`, __pageType: 'customers/login' }
    }));
  }

  write('/404.html', await renderPage({
    template: '404',
    title: 'Page not found — Addison Emma',
    scope: { __path: '/404', __pageType: '404' }
  }));

  /* Report */
  console.log(`\n  Aveyron → ${path.relative(process.cwd(), OUT)}`);
  console.log(`  ${written.length} pages${BASE ? `, base ${BASE}` : ''}${DOMAIN ? `, CNAME ${DOMAIN}` : ''}\n`);

  if (failures.length) {
    const unique = [...new Map(failures.map((f) => [f.type + f.message, f])).values()];
    console.error(`  ${unique.length} section failure(s):`);
    for (const f of unique) console.error(`   • ${f.type}: ${f.message}`);
    console.error('');
    process.exitCode = 1;
  } else {
    console.log('  No section errors.\n');
  }
}

/** The slice of catalogue data the browser needs for search and the cart. */
function productIndex() {
  return store.products.map((p) => ({
    id: p.id,
    handle: p.handle,
    title: p.title,
    url: p.url,
    type: p.type,
    material: p.metafields.custom.material.value,
    price: p.price,
    available: p.available,
    image: p.featured_media.preview_image.src,
    tags: p.tags,
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      options: v.options,
      available: v.available,
      price: v.price
    }))
  }));
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
