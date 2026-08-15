/**
 * Shopify's Liquid filters, enough of them to render this theme faithfully.
 * Anything the theme does not use is deliberately absent.
 */

import { strftime, namedDate } from './dates.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function handleize(input) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* --- Translation -------------------------------------------------------- */

function lookup(dict, key) {
  return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), dict);
}

export function makeTranslate(locale) {
  return function t(key, ...args) {
    const named = normaliseNamedArgs(args);
    let value = lookup(locale, String(key));

    if (value && typeof value === 'object') {
      // Shopify pluralisation: { one: …, other: … } chosen by `count`.
      const count = Number(named.count);
      value = Number.isFinite(count) && count === 1 ? value.one : value.other;
    }

    if (typeof value !== 'string') return `translation missing: ${key}`;

    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) =>
      named[name] === undefined ? '' : String(named[name])
    );
  };
}

/**
 * liquidjs hands `foo: 'bar'` filter arguments over as ['foo', 'bar'] tuples.
 * Shopify themes lean on these heavily, so collect them into a plain object
 * and tolerate a trailing options object too.
 */
function normaliseNamedArgs(args) {
  const out = {};
  for (const arg of args) {
    if (Array.isArray(arg) && arg.length === 2 && typeof arg[0] === 'string') {
      out[arg[0]] = arg[1];
    } else if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      Object.assign(out, arg);
    }
  }
  return out;
}

/* --- Money -------------------------------------------------------------- */

const group = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function makeMoney(shop) {
  const render = (cents, withCurrency) => {
    const amount = Number(cents || 0) / 100;
    const whole = Math.round(amount);
    const body =
      amount % 1 === 0 ? `$${group(whole)}` : `$${group(Math.floor(amount))}.${String(Math.round((amount % 1) * 100)).padStart(2, '0')}`;
    return withCurrency ? `${body} ${shop.currency}` : body;
  };
  return {
    money: (c) => render(c, false),
    money_with_currency: (c) => render(c, true),
    money_without_trailing_zeros: (c) => render(c, false)
  };
}

/* --- Images ------------------------------------------------------------- */

function imageSrc(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.src || image.url || '';
}

export function image_url(image, ...args) {
  const src = imageSrc(image);
  if (!src) return '';
  const opts = normaliseNamedArgs(args);
  const width = opts.width || 1000;
  if (src.startsWith('https://images.unsplash.com')) {
    return `${src}?auto=format&fit=crop&w=${width}&q=72`;
  }
  const join = src.includes('?') ? '&' : '?';
  return `${src}${join}width=${width}`;
}

/** Rebuilds an image_url at a different width, for srcset entries. */
function atWidth(url, width) {
  if (url.includes('images.unsplash.com')) return url.replace(/([?&])w=\d+/, `$1w=${width}`);
  return url.replace(/([?&])width=\d+/, `$1width=${width}`);
}

export function image_tag(url, ...args) {
  const opts = normaliseNamedArgs(args);
  const attrs = [];
  const skip = new Set(['widths', 'width', 'height', 'sizes', 'preload']);

  const widths = String(opts.widths || '')
    .split(',')
    .map((w) => parseInt(w.trim(), 10))
    .filter(Boolean);

  attrs.push(`src="${esc(url)}"`);

  if (widths.length) {
    const srcset = widths.map((w) => `${esc(atWidth(url, w))} ${w}w`).join(', ');
    attrs.push(`srcset="${srcset}"`);
  }
  if (opts.sizes) attrs.push(`sizes="${esc(opts.sizes)}"`);

  for (const [key, value] of Object.entries(opts)) {
    if (skip.has(key) || value === undefined || value === null || value === false) continue;
    attrs.push(`${key}="${esc(value)}"`);
  }

  if (!('alt' in opts)) attrs.push('alt=""');
  if (!('loading' in opts)) attrs.push('loading="lazy"');
  attrs.push('decoding="async"');

  return `<img ${attrs.join(' ')}>`;
}

export function placeholder_svg_tag(name, className = '') {
  return (
    `<svg class="${esc(className)}" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(name)}">` +
    `<rect width="60" height="60" fill="currentColor" opacity="0.08"/>` +
    `<path d="M18 40l8-11 6 8 4-5 6 8z" fill="currentColor" opacity="0.35"/>` +
    `<circle cx="22" cy="21" r="3.4" fill="currentColor" opacity="0.35"/>` +
    `</svg>`
  );
}

const PAYMENT_MARKS = {
  visa: 'VISA',
  master: 'MC',
  american_express: 'AMEX',
  paypal: 'PayPal',
  apple_pay: 'Pay',
  shopify_pay: 'Shop'
};

export function payment_type_svg_tag(type, ...args) {
  const opts = normaliseNamedArgs(args);
  const label = PAYMENT_MARKS[type] || String(type);
  const w = label.length * 7 + 14;
  return (
    `<svg class="${esc(opts.class || '')}" viewBox="0 0 ${w} 20" role="img" aria-label="${esc(label)}">` +
    `<rect width="${w}" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>` +
    `<text x="${w / 2}" y="13.5" text-anchor="middle" font-size="8" font-family="monospace" fill="currentColor">${esc(label)}</text>` +
    `</svg>`
  );
}

/* --- Colour ------------------------------------------------------------- */

function parseHex(hex) {
  const h = String(hex || '').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
}

export const color_to_rgb = (hex) => `rgb(${parseHex(hex).join(', ')})`;

export const color_darken = (hex, amount) => {
  const factor = 1 - Number(amount || 0) / 100;
  const [r, g, b] = parseHex(hex).map((c) => Math.max(0, Math.min(255, Math.round(c * factor))));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

export const color_lighten = (hex, amount) => color_darken(hex, -Number(amount || 0));

/* --- Assorted ----------------------------------------------------------- */

export function default_errors(errors) {
  if (!errors) return '';
  if (Array.isArray(errors)) return errors.join(' ');
  if (errors.messages) return Object.values(errors.messages).join(' ');
  return String(errors);
}

export function format_address(address) {
  if (!address) return '';
  const lines = [
    [address.first_name, address.last_name].filter(Boolean).join(' '),
    address.company,
    address.address1,
    address.address2,
    [address.zip, address.city].filter(Boolean).join(' '),
    address.province,
    address.country
  ].filter(Boolean);
  return lines.map((line) => `<p>${esc(line)}</p>`).join('');
}

export const format_code = (code) => String(code || '').replace(/(.{4})/g, '$1 ').trim();

export function payment_button() {
  return (
    '<button type="button" class="btn btn--ghost btn--full" style="margin-top:10px" data-demo-express>' +
    'Buy it now</button>'
  );
}

/* --- Registration ------------------------------------------------------- */

export function registerFilters(engine, { locale, shop, dateFormats, assetVersions = {} }) {
  const t = makeTranslate(locale);
  const money = makeMoney(shop);

  /* A content hash per asset, so a new deploy is never served from cache. */
  const assetUrl = (name) => {
    const version = assetVersions[name];
    return `${shop.assetBase}${name}${version ? `?v=${version}` : ''}`;
  };

  const table = {
    t,
    ...money,
    image_url,
    img_url: image_url,
    image_tag,
    placeholder_svg_tag,
    payment_type_svg_tag,
    color_to_rgb,
    color_darken,
    color_lighten,
    default_errors,
    format_address,
    format_code,
    payment_button,
    handle: handleize,
    handleize,
    asset_url: assetUrl,
    file_url: assetUrl,
    global_asset_url: assetUrl,
    stylesheet_tag: (url) => `<link rel="stylesheet" href="${esc(url)}">`,
    script_tag: (url) => `<script src="${esc(url)}" defer></script>`,
    within: (url) => url,
    link_to: (label, url) => `<a href="${esc(url)}">${esc(label)}</a>`,
    weight_with_unit: (grams) => `${(Number(grams || 0) / 1000).toFixed(2)} kg`,
    at_least: (a, b) => Math.max(Number(a), Number(b)),
    at_most: (a, b) => Math.min(Number(a), Number(b)),
    /** Shopify's date filter: strftime, or a named format from the locale. */
    date: (input, ...args) => {
      const named = normaliseNamedArgs(args);
      const positional = args.find((a) => typeof a === 'string');
      if (named.format) return namedDate(input, named.format, dateFormats);
      if (named.format) return namedDate(input, named.format, dateFormats);
      if (positional) return strftime(input, positional);
      return strftime(input, '%d %B %Y');
    }
  };

  for (const [name, fn] of Object.entries(table)) engine.registerFilter(name, fn);
}
