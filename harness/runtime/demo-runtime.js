/* ==========================================================================
   Aveyron — demo runtime

   GitHub Pages serves files, not Shopify. This intercepts the handful of
   endpoints the theme talks to and answers them from a product index held in
   the page, so the bag, predictive search, recommendations and recently
   viewed all behave exactly as they will on the real storefront.

   It is loaded ONLY by the static preview build. It is not part of the theme.
   ========================================================================== */

(function () {
  'use strict';

  const BASE = window.__DEMO_BASE || '';
  const PRODUCTS = window.__DEMO_PRODUCTS || [];
  const CART_KEY = 'addison-emma:demo-cart';

  const byVariant = new Map();
  for (const product of PRODUCTS) {
    for (const variant of product.variants) byVariant.set(String(variant.id), { product, variant });
  }

  const esc = (s) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const money = (cents) => '$' + Math.round(cents / 100).toLocaleString('en-US');

  const img = (src, w) => `${src}?auto=format&fit=crop&w=${w}&q=72`;

  /* --- Cart state ------------------------------------------------------- */

  function readCart() {
    let lines = [];
    try {
      lines = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      lines = [];
    }
    return lines.filter((l) => byVariant.has(String(l.id)));
  }

  function writeCart(lines) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch (e) {
      /* private browsing — the bag lasts for this page only */
    }
  }

  let attributes = {};
  try {
    attributes = JSON.parse(localStorage.getItem(CART_KEY + ':attrs') || '{}');
  } catch (e) {
    attributes = {};
  }

  function saveAttributes() {
    try {
      localStorage.setItem(CART_KEY + ':attrs', JSON.stringify(attributes));
    } catch (e) {
      /* nothing to save with */
    }
  }

  function cartObject() {
    const lines = readCart();
    const items = lines.map((line) => {
      const { product, variant } = byVariant.get(String(line.id));
      return {
        key: String(line.id),
        id: variant.id,
        quantity: line.quantity,
        title: product.title,
        product_title: product.title,
        variant_title: variant.title === 'Default Title' ? null : variant.title,
        url: product.url,
        image: product.image,
        price: variant.price,
        final_line_price: variant.price * line.quantity,
        original_line_price: variant.price * line.quantity
      };
    });
    const subtotal = items.reduce((t, i) => t + i.final_line_price, 0);
    return {
      item_count: items.reduce((t, i) => t + i.quantity, 0),
      items,
      total_price: subtotal,
      items_subtotal_price: subtotal,
      original_total_price: subtotal,
      total_discount: 0,
      currency: 'EUR',
      note: '',
      attributes
    };
  }

  /* --- Rendering the drawer -------------------------------------------- */

  function deliveryDate(days) {
    const d = new Date(Date.now() + days * 86400000);
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'long' })}`;
  }

  function cartLineHTML(item) {
    return `
      <li>
        <cart-line class="cart-line" data-key="${esc(item.key)}" data-quantity="${item.quantity}">
          <div class="media media--3-4 cart-line__media">
            <img class="media__img" src="${esc(img(item.image, 252))}" alt="${esc(item.title)}" loading="lazy" decoding="async">
          </div>
          <div>
            <div class="cart-line__top">
              <a class="cart-line__title" href="${esc(item.url)}">${esc(item.product_title)}</a>
              <div class="cart-line__price">${money(item.final_line_price)}</div>
            </div>
            <div class="cart-line__meta">${esc(item.variant_title || '')}</div>
            <div class="cart-line__controls">
              <div class="qty qty--small">
                <button class="qty__button" type="button" data-qty-step="-1" aria-label="Reduce the quantity of ${esc(item.product_title)}">&ndash;</button>
                <input class="qty__input" type="number" inputmode="numeric" min="0" value="${item.quantity}" data-qty-input aria-label="Quantity of ${esc(item.product_title)}">
                <button class="qty__button" type="button" data-qty-step="1" aria-label="Increase the quantity of ${esc(item.product_title)}">+</button>
              </div>
              <button class="cart-line__remove" type="button" data-line-remove>Remove</button>
            </div>
          </div>
        </cart-line>
      </li>`;
  }

  function drawerHTML() {
    const cart = cartObject();
    const settings = (window.Theme && window.Theme.settings) || {};

    if (!cart.item_count) {
      return `
        <div class="drawer__body">
          <div class="cart-empty">
            <p class="cart-empty__title">Your bag is empty</p>
            <p class="cart-empty__text">Pieces you save are kept for ${settings.wishlistDays || 30} days. Our advisors can also hold a size for you by telephone.</p>
            <a class="link-rule" href="${BASE}/collections/all/" style="margin-top: 26px;">Browse the collection</a>
          </div>
        </div>`;
    }

    const wrapped = attributes['Gift wrap'] === 'Yes';

    return `
      <div class="drawer__body">
        <ul>${cart.items.map(cartLineHTML).join('')}</ul>
        <cart-gift-wrap>
          <label class="cart-gift">
            <input type="checkbox"${wrapped ? ' checked' : ''}>
            <span>Wrap in our ribboned box with a hand-written card <span style="color: var(--faint);">&mdash; no charge</span></span>
          </label>
        </cart-gift-wrap>
      </div>
      <form class="drawer__foot" action="${BASE}/cart/" method="post" novalidate>
        <div class="cart-total"><span>Subtotal</span><span>${money(cart.items_subtotal_price)}</span></div>
        <div class="cart-total"><span>Shipping</span><span>Complimentary, insured</span></div>
        <div class="cart-total cart-total--grand"><span>Total</span><span>${money(cart.total_price)} EUR</span></div>
        <button class="btn btn--full" type="button" style="margin-top: 22px;" data-demo-checkout>Proceed to checkout</button>
        <p class="cart-foot-note">Delivered ${deliveryDate(settings.cartDeliveryDays || 3)} — returns within 30 days</p>
      </form>`;
  }

  /** The theme asks for named sections; we answer with the same shape. */
  function sectionsPayload(names) {
    const out = {};
    for (const name of names || []) {
      if (name === 'cart-drawer') out[name] = `<div data-cart-section="cart-drawer">${drawerHTML()}</div>`;
      else if (name === 'main-cart') out[name] = `<div data-cart-section="main-cart">${cartPageHTML()}</div>`;
    }
    return out;
  }

  function cartPageHTML() {
    const cart = cartObject();
    if (!cart.item_count) {
      return `
        <div class="page">
          <header style="padding: 66px 0 26px; border-bottom: 1px solid var(--rule);">
            <p class="kicker">Your bag</p>
            <h1 class="display display--l" style="margin-top: 18px;">Before you go</h1>
          </header>
          <div class="collection-empty">
            <p class="collection-empty__title">Your bag is empty</p>
            <a class="link-rule" href="${BASE}/collections/all/" style="margin-top: 26px;">Browse the collection</a>
          </div>
        </div>`;
    }
    return `
      <div class="page">
        <header style="padding: 66px 0 26px; border-bottom: 1px solid var(--rule);">
          <p class="kicker">Your bag</p>
          <h1 class="display display--l" style="margin-top: 18px;">Before you go</h1>
        </header>
        <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:clamp(32px,6vw,80px);padding:40px 0 104px;align-items:start;">
          <ul>${cart.items.map(cartLineHTML).join('')}</ul>
          <aside style="background:var(--paper-alt);padding:34px;">
            <p class="kicker kicker--faint" style="margin-bottom:20px;">Summary</p>
            <div class="cart-total"><span>Subtotal</span><span>${money(cart.items_subtotal_price)}</span></div>
            <div class="cart-total"><span>Shipping</span><span>Complimentary, insured</span></div>
            <div class="cart-total cart-total--grand"><span>Total</span><span>${money(cart.total_price)} EUR</span></div>
            <button class="btn btn--full" type="button" style="margin-top:24px;" data-demo-checkout>Proceed to checkout</button>
          </aside>
        </div>
      </div>`;
  }

  /* --- Product cards for search and rails ------------------------------ */

  function cardHTML(product, opts) {
    const compact = opts && opts.compact;
    return `
      <div class="card">
        <a class="card__link" href="${esc(product.url)}">
          <div class="media media--ratio-card card__media">
            <img class="media__img card__img" src="${esc(img(product.image, 600))}" alt="${esc(product.title)}" loading="lazy" decoding="async">
          </div>
          <div class="card__body">
            <div>
              <div class="card__title"${compact ? ' style="font-size:16px"' : ''}>${esc(product.title)}</div>
              ${compact ? '' : `<div class="card__material">${esc(product.material)}</div>`}
            </div>
            ${compact ? '' : `<div class="card__price">${money(product.price)}</div>`}
          </div>
        </a>
      </div>`;
  }

  function searchResultsHTML(matches) {
    if (!matches.length) {
      return `<p class="prose" style="margin-top:20px;max-width:460px;">Try a cloth, a colour, or the name of a piece. Or telephone the house — our advisors know the collection by heart.</p>`;
    }
    return `
      <div class="panel__results">
        ${matches
          .map(
            (p) => `
          <a class="panel__result" href="${esc(p.url)}" data-search-result role="option" aria-selected="false">
            <div class="media media--3-4">
              <img class="media__img" src="${esc(img(p.image, 480))}" alt="${esc(p.title)}" loading="lazy" decoding="async">
            </div>
            <div class="panel__result-title">${esc(p.title)}</div>
            <div class="panel__result-price">${money(p.price)}</div>
          </a>`
          )
          .join('')}
      </div>`;
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    return PRODUCTS.filter((p) => {
      const hay = `${p.title} ${p.material} ${p.type} ${p.tags.join(' ')}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  /* --- fetch interception ---------------------------------------------- */

  const nativeFetch = window.fetch.bind(window);

  const jsonResponse = (body) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const htmlResponse = (body) =>
    new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } });

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
    const parsed = new URL(url, window.location.origin);
    const route = parsed.pathname.replace(BASE, '') || '/';

    let body = {};
    if (init && init.body) {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = {};
      }
    }

    /* Cart */
    if (route === '/cart/add') {
      const lines = readCart();
      for (const item of body.items || []) {
        const key = String(item.id);
        if (!byVariant.has(key)) continue;
        const existing = lines.find((l) => String(l.id) === key);
        if (existing) existing.quantity += item.quantity || 1;
        else lines.push({ id: item.id, quantity: item.quantity || 1 });
      }
      writeCart(lines);
      return Promise.resolve(jsonResponse({ items: body.items || [], sections: sectionsPayload(body.sections) }));
    }

    if (route === '/cart/change') {
      const lines = readCart();
      const index = lines.findIndex((l) => String(l.id) === String(body.id));
      if (index > -1) {
        if (Number(body.quantity) <= 0) lines.splice(index, 1);
        else lines[index].quantity = Number(body.quantity);
        writeCart(lines);
      }
      return Promise.resolve(jsonResponse({ ...cartObject(), sections: sectionsPayload(body.sections) }));
    }

    if (route === '/cart/update') {
      if (body.attributes) {
        Object.assign(attributes, body.attributes);
        saveAttributes();
      }
      return Promise.resolve(jsonResponse({ ...cartObject(), sections: sectionsPayload(body.sections) }));
    }

    if (route === '/cart.js' || route === '/cart/.js' || route === '/cart') {
      return Promise.resolve(jsonResponse(cartObject()));
    }

    /* Predictive search */
    if (route === '/search/suggest') {
      const matches = search(parsed.searchParams.get('q') || '').slice(0, 6);
      const label = matches.length
        ? matches.length === 1
          ? '1 piece found'
          : `${matches.length} pieces found`
        : `Nothing found for “${parsed.searchParams.get('q')}”`;
      return Promise.resolve(
        htmlResponse(
          `<span data-search-status>${esc(label)}</span><div data-search-results>${searchResultsHTML(matches)}</div>`
        )
      );
    }

    /* Recently viewed asks the search endpoint for specific handles */
    if (route === '/search' && parsed.searchParams.get('section_id') === 'recent-results') {
      const q = parsed.searchParams.get('q') || '';
      const handles = (q.match(/handle:([a-z0-9-]+)/g) || []).map((m) => m.replace('handle:', ''));
      const found = handles.map((h) => PRODUCTS.find((p) => p.handle === h)).filter(Boolean);
      return Promise.resolve(
        htmlResponse(`<div data-recent-results>${found.map((p) => cardHTML(p, { compact: true })).join('')}</div>`)
      );
    }

    /* Product recommendations */
    if (route === '/recommendations/products') {
      const id = parsed.searchParams.get('product_id');
      const limit = Number(parsed.searchParams.get('limit')) || 4;
      const picks = PRODUCTS.filter((p) => String(p.id) !== String(id)).slice(0, limit);
      return Promise.resolve(
        htmlResponse(
          `<section class="section page" style="padding-bottom:40px;">
             <div class="section-head">
               <h2 class="section-head__title">Worn with</h2>
               <a class="section-head__link" href="${BASE}/collections/all/">The whole collection</a>
             </div>
             <div class="product-grid" style="--cols:4;--cols-tablet:3;--cols-mobile:2;padding-top:42px;">
               ${picks.map((p) => cardHTML(p)).join('')}
             </div>
           </section>`
        )
      );
    }

    return nativeFetch(input, init);
  };

  /* --- Things a static host genuinely cannot do ------------------------ */

  function notice(message) {
    if (window.Theme && typeof window.Theme.toast === 'function') window.Theme.toast(message);
    else alert(message);
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-demo-checkout], [name="checkout"], [data-demo-express]')) {
      event.preventDefault();
      notice('Checkout opens on the live store');
    }
  });

  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target.closest('[data-demo-form]');
      if (!form) return;
      event.preventDefault();
      const type = form.getAttribute('data-demo-form');
      const messages = {
        customer: 'Thank you — the next letter will find you',
        contact: 'Request received',
        new_comment: 'Your letter has been received',
        customer_login: 'Accounts open on the live store',
        create_customer: 'Accounts open on the live store',
        storefront_password: 'Accounts open on the live store'
      };
      notice(messages[type] || 'Submitted on the live store');
    },
    true
  );

  /* The sort control: static hosting cannot read a query string, so send the
     visitor to a page that was rendered for that order. */
  document.addEventListener('change', (event) => {
    const select = event.target.closest('#SortBy');
    if (!select) return;
    event.stopPropagation();
    notice('Sorting runs on the live store');
  }, true);

  /* --- A quiet marker, so nobody mistakes this for the shop ------------ */

  window.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('a');
    badge.href = `${BASE}/`;
    badge.textContent = 'Preview';
    badge.setAttribute('aria-label', 'This is a static preview of the Addison Emma theme');
    badge.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:200;padding:6px 12px;background:var(--brand);' +
      'color:var(--on-brand);font-family:var(--font-mono);font-size:9px;letter-spacing:0.2em;' +
      'text-transform:uppercase;opacity:0.5;transition:opacity .3s;text-decoration:none;';
    badge.addEventListener('mouseenter', () => (badge.style.opacity = '1'));
    badge.addEventListener('mouseleave', () => (badge.style.opacity = '0.5'));
    document.body.appendChild(badge);
  });
})();
