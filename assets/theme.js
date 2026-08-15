/* ==========================================================================
   Aveyron — behaviour
   Custom elements only. No framework, no build step, no jQuery.
   Every element degrades to a working link or form when JS is absent.
   ========================================================================== */

(function () {
  'use strict';

  const T = window.Theme || {};
  const routes = T.routes || {};
  const strings = T.strings || {};
  const config = T.settings || {};

  /* --- Small helpers ------------------------------------------------------ */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function formatMoney(cents) {
    const format = config.moneyFormat || '${{amount}}';
    const value = (cents / 100).toLocaleString(document.documentElement.lang || 'en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const whole = Math.round(cents / 100).toLocaleString(document.documentElement.lang || 'en');
    return format
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, whole)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, value)
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, whole)
      .replace(/\{\{\s*amount\s*\}\}/, value);
  }

  /* Scroll lock that survives nesting — two open overlays, one lock. */
  let lockCount = 0;
  let lockOffset = 0;
  function lockScroll() {
    if (lockCount === 0) {
      lockOffset = window.scrollY;
      document.body.style.top = `-${lockOffset}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.classList.add('is-locked');
    }
    lockCount += 1;
  }

  function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('is-locked');
      window.scrollTo(0, lockOffset);
    }
  }

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  function trapFocus(container, initial) {
    const focusables = () => $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
    const onKeydown = (event) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', onKeydown);
    window.requestAnimationFrame(() => {
      const target = initial || focusables()[0];
      if (target) target.focus();
    });
    return () => container.removeEventListener('keydown', onKeydown);
  }

  /* --- Toasts ------------------------------------------------------------- */

  class ToastShelf extends HTMLElement {
    show(message) {
      if (!message) return;
      const node = document.createElement('div');
      node.className = 'toast';
      node.textContent = message;
      this.appendChild(node);
      setTimeout(() => {
        node.classList.add('is-leaving');
        node.addEventListener('animationend', () => node.remove(), { once: true });
      }, 2400);
    }
  }
  customElements.define('toast-shelf', ToastShelf);

  function toast(message) {
    const shelf = $('toast-shelf');
    if (shelf && typeof shelf.show === 'function') shelf.show(message);
  }
  window.Theme.toast = toast;

  /* --- Reveal on scroll --------------------------------------------------- */

  const revealObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            });
          },
          { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
        )
      : null;

  function watchReveals(root) {
    const scope = root || document;
    const nodes = $$('[data-reveal]:not(.is-revealed), [data-reveal-rule]:not(.is-revealed)', scope);
    if (!config.reveals || prefersReducedMotion() || !revealObserver) {
      nodes.forEach((n) => n.classList.add('is-revealed'));
      return;
    }
    nodes.forEach((n) => revealObserver.observe(n));
  }

  /* --- Cart state --------------------------------------------------------- */

  const cartSubscribers = new Set();

  function publishCart(cart) {
    cartSubscribers.forEach((fn) => {
      try {
        fn(cart);
      } catch (error) {
        console.error(error);
      }
    });
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
  }

  function sectionsToRender() {
    const ids = new Set();
    $$('[data-cart-section]').forEach((el) => ids.add(el.dataset.cartSection));
    return Array.from(ids);
  }

  function applySections(payload) {
    if (!payload || !payload.sections) return;
    Object.keys(payload.sections).forEach((id) => {
      const markup = payload.sections[id];
      if (typeof markup !== 'string') return;
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      $$(`[data-cart-section="${id}"]`).forEach((target) => {
        const source = parsed.querySelector(`[data-cart-section="${id}"]`) || parsed.body;
        target.innerHTML = source.innerHTML;
        watchReveals(target);
      });
    });
  }

  async function cartRequest(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(Object.assign({ sections: sectionsToRender() }, body))
    });
    const data = await response.json();
    if (!response.ok || data.status) {
      const error = new Error(data.description || data.message || strings.error);
      error.payload = data;
      throw error;
    }
    return data;
  }

  const Cart = {
    async add(items, options) {
      const opts = options || {};
      const data = await cartRequest(routes.cartAdd, { items });
      applySections(data);
      const cart = await Cart.refresh();
      if (!opts.silent) toast(strings.addedToBag);
      if (config.cartDrawer && !opts.keepClosed) {
        const drawer = $('cart-drawer');
        if (drawer) drawer.open();
      }
      return cart;
    },

    async change(payload) {
      const data = await cartRequest(routes.cartChange, payload);
      applySections(data);
      publishCart(data);
      return data;
    },

    async update(payload) {
      const data = await cartRequest(routes.cartUpdate, payload);
      applySections(data);
      publishCart(data);
      return data;
    },

    async refresh() {
      const response = await fetch(`${routes.cart}.js`, { headers: { Accept: 'application/json' } });
      const cart = await response.json();
      publishCart(cart);
      return cart;
    },

    subscribe(fn) {
      cartSubscribers.add(fn);
      return () => cartSubscribers.delete(fn);
    }
  };
  window.Theme.cart = Cart;

  /* --- Wishlist (localStorage; no account required) ----------------------- */

  const WISHLIST_KEY = 'addison-emma:saved';

  const Wishlist = {
    read() {
      try {
        const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        const cutoff = Date.now() - (config.wishlistDays || 30) * 86400000;
        return raw.filter((entry) => entry && entry.handle && entry.at > cutoff);
      } catch (error) {
        return [];
      }
    },

    write(items) {
      try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
      } catch (error) {
        /* Private browsing. The heart still lights up for this session. */
      }
      document.dispatchEvent(new CustomEvent('wishlist:updated', { detail: { items } }));
    },

    has(handle) {
      return this.read().some((entry) => entry.handle === handle);
    },

    toggle(handle) {
      const items = this.read();
      const index = items.findIndex((entry) => entry.handle === handle);
      if (index > -1) {
        items.splice(index, 1);
        this.write(items);
        return false;
      }
      items.push({ handle, at: Date.now() });
      this.write(items);
      return true;
    },

    handles() {
      return this.read().map((entry) => entry.handle);
    }
  };
  window.Theme.wishlist = Wishlist;

  class WishlistButton extends HTMLElement {
    connectedCallback() {
      this.handle = this.dataset.handle;
      this.button = this.querySelector('button') || this;
      this.sync();
      this.button.addEventListener('click', (event) => {
        event.preventDefault();
        const saved = Wishlist.toggle(this.handle);
        toast(saved ? strings.saved : strings.unsaved);
      });
      this._unsub = () => document.removeEventListener('wishlist:updated', this._onChange);
      this._onChange = () => this.sync();
      document.addEventListener('wishlist:updated', this._onChange);
    }

    disconnectedCallback() {
      if (this._unsub) this._unsub();
    }

    sync() {
      const saved = Wishlist.has(this.handle);
      this.button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      const label = saved ? this.dataset.labelRemove : this.dataset.labelAdd;
      if (label) this.button.setAttribute('aria-label', label);
    }
  }
  customElements.define('wishlist-button', WishlistButton);

  class WishlistCount extends HTMLElement {
    connectedCallback() {
      this.render();
      this._onChange = () => this.render();
      document.addEventListener('wishlist:updated', this._onChange);
    }

    disconnectedCallback() {
      document.removeEventListener('wishlist:updated', this._onChange);
    }

    render() {
      this.textContent = String(Wishlist.read().length);
    }
  }
  customElements.define('wishlist-count', WishlistCount);

  /* Renders the saved-pieces page from whatever is in localStorage. */
  class WishlistGrid extends HTMLElement {
    connectedCallback() {
      this.render();
      this._onChange = () => this.render();
      document.addEventListener('wishlist:updated', this._onChange);
    }

    disconnectedCallback() {
      document.removeEventListener('wishlist:updated', this._onChange);
    }

    render() {
      const handles = Wishlist.handles();
      const grid = this.querySelector('[data-wishlist-grid]');
      const empty = this.querySelector('[data-wishlist-empty]');
      if (!grid) return;

      const cards = $$('[data-wishlist-card]', this);
      let shown = 0;
      cards.forEach((card) => {
        const match = handles.indexOf(card.dataset.wishlistCard) > -1;
        card.hidden = !match;
        if (match) shown += 1;
      });

      if (empty) empty.hidden = shown > 0;
      grid.hidden = shown === 0;
    }
  }
  customElements.define('wishlist-grid', WishlistGrid);

  /* --- Recently viewed ---------------------------------------------------- */

  const RECENT_KEY = 'addison-emma:recent';

  function rememberProduct(handle) {
    if (!config.recentlyViewed || !handle) return;
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((h) => h !== handle);
      list.unshift(handle);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 12)));
    } catch (error) {
      /* nothing to remember with */
    }
  }

  class RecentlyViewed extends HTMLElement {
    connectedCallback() {
      if (!config.recentlyViewed) {
        this.remove();
        return;
      }
      let handles = [];
      try {
        handles = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      } catch (error) {
        handles = [];
      }
      const exclude = this.dataset.exclude;
      handles = handles.filter((h) => h && h !== exclude).slice(0, Number(this.dataset.limit || 6));

      if (!handles.length) {
        this.remove();
        return;
      }

      const query = handles.map((h) => `handle:${h}`).join(' OR ');
      const url = `${routes.search}?q=${encodeURIComponent(query)}&type=product&options[unavailable_products]=last&section_id=${this.dataset.sectionId}`;

      fetch(url)
        .then((response) => (response.ok ? response.text() : Promise.reject(response)))
        .then((text) => {
          const parsed = new DOMParser().parseFromString(text, 'text/html');
          const results = parsed.querySelector('[data-recent-results]');
          const target = this.querySelector('[data-recent-target]');
          if (!results || !results.children.length || !target) {
            this.remove();
            return;
          }
          target.innerHTML = results.innerHTML;
          this.hidden = false;
          watchReveals(this);
        })
        .catch(() => this.remove());
    }
  }
  customElements.define('recently-viewed', RecentlyViewed);

  /* --- Overlay base ------------------------------------------------------- */

  class Overlay extends HTMLElement {
    connectedCallback() {
      this.isOpen = false;
      this.addEventListener('click', (event) => {
        if (event.target.matches('[data-overlay-close]')) {
          event.preventDefault();
          this.close();
        }
      });
      this._onKeydown = (event) => {
        if (event.key === 'Escape' && this.isOpen) {
          event.stopPropagation();
          this.close();
        }
      };
    }

    open(opener) {
      if (this.isOpen) return;
      this.isOpen = true;
      this.opener = opener || document.activeElement;
      this.hidden = false;
      this.setAttribute('open', '');
      lockScroll();
      document.addEventListener('keydown', this._onKeydown);
      this._releaseFocus = trapFocus(this, this.querySelector('[data-autofocus]'));
      this.dispatchEvent(new CustomEvent('overlay:open', { bubbles: true }));
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.hidden = true;
      this.removeAttribute('open');
      unlockScroll();
      document.removeEventListener('keydown', this._onKeydown);
      if (this._releaseFocus) this._releaseFocus();
      if (this.opener && document.contains(this.opener)) this.opener.focus();
      this.dispatchEvent(new CustomEvent('overlay:close', { bubbles: true }));
    }

    toggle(opener) {
      this.isOpen ? this.close() : this.open(opener);
    }
  }

  /* --- Cart drawer -------------------------------------------------------- */

  class CartDrawer extends Overlay {}
  customElements.define('cart-drawer', CartDrawer);

  /* Quantity stepper + remove, with optimistic dimming. */
  class CartLine extends HTMLElement {
    connectedCallback() {
      this.key = this.dataset.key;
      this.addEventListener('click', (event) => {
        const step = event.target.closest('[data-qty-step]');
        const remove = event.target.closest('[data-line-remove]');
        if (step) {
          event.preventDefault();
          const delta = Number(step.dataset.qtyStep);
          this.setQuantity(Math.max(0, this.quantity + delta));
        } else if (remove) {
          event.preventDefault();
          this.setQuantity(0, true);
        }
      });

      const input = this.querySelector('[data-qty-input]');
      if (input) {
        input.addEventListener('change', () => {
          const next = Math.max(0, parseInt(input.value, 10) || 0);
          this.setQuantity(next);
        });
      }
    }

    get quantity() {
      const input = this.querySelector('[data-qty-input]');
      return input ? parseInt(input.value, 10) || 0 : Number(this.dataset.quantity || 0);
    }

    async setQuantity(quantity, removing) {
      this.classList.add('is-updating');
      try {
        await Cart.change({ id: this.key, quantity });
        if (removing || quantity === 0) toast(strings.removedFromBag);
      } catch (error) {
        this.classList.remove('is-updating');
        toast(error.message || strings.error);
      }
    }
  }
  customElements.define('cart-line', CartLine);

  class CartGiftWrap extends HTMLElement {
    connectedCallback() {
      const input = this.querySelector('input[type="checkbox"]');
      if (!input) return;
      input.addEventListener('change', async () => {
        input.disabled = true;
        try {
          await Cart.update({ attributes: { 'Gift wrap': input.checked ? 'Yes' : '' } });
        } catch (error) {
          input.checked = !input.checked;
          toast(error.message || strings.error);
        } finally {
          input.disabled = false;
        }
      });
    }
  }
  customElements.define('cart-gift-wrap', CartGiftWrap);

  class CartNote extends HTMLElement {
    connectedCallback() {
      const field = this.querySelector('textarea');
      if (!field) return;
      field.addEventListener(
        'input',
        debounce(() => Cart.update({ note: field.value }).catch(() => {}), 500)
      );
    }
  }
  customElements.define('cart-note', CartNote);

  /* --- Add to cart forms -------------------------------------------------- */

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;
      this.submitButton = this.querySelector('[type="submit"]');
      this.form.addEventListener('submit', (event) => this.onSubmit(event));
    }

    async onSubmit(event) {
      event.preventDefault();
      if (!this.submitButton || this.submitButton.getAttribute('aria-disabled') === 'true') return;

      const idField = this.form.querySelector('[name="id"]');
      if (!idField || !idField.value) return;

      const quantityField = this.form.querySelector('[name="quantity"]');
      const label = this.submitButton.querySelector('[data-button-label]') || this.submitButton;
      const original = label.textContent;

      this.submitButton.setAttribute('aria-disabled', 'true');
      this.submitButton.classList.add('is-loading');

      const properties = {};
      $$('[name^="properties["]', this.form).forEach((field) => {
        const match = field.name.match(/properties\[(.+)\]/);
        if (!match) return;
        if (field.type === 'checkbox' && !field.checked) return;
        if (field.value) properties[match[1]] = field.value;
      });

      try {
        await Cart.add([
          {
            id: Number(idField.value),
            quantity: Number(quantityField ? quantityField.value : 1) || 1,
            properties: Object.keys(properties).length ? properties : undefined
          }
        ]);
      } catch (error) {
        toast(error.message || strings.error);
      } finally {
        this.submitButton.removeAttribute('aria-disabled');
        this.submitButton.classList.remove('is-loading');
        label.textContent = original;
      }
    }
  }
  customElements.define('product-form', ProductForm);

  /* --- Variant picker ----------------------------------------------------- */

  class VariantPicker extends HTMLElement {
    connectedCallback() {
      this.variants = this.readVariants();
      this.options = $$('[data-option-group]', this);
      this.addEventListener('click', (event) => {
        const value = event.target.closest('[data-option-value]');
        if (!value || value.getAttribute('aria-checked') === 'true') return;
        event.preventDefault();
        this.select(value);
      });
      this.addEventListener('keydown', (event) => this.onKeydown(event));
      this.updateAvailability();
    }

    readVariants() {
      const script = this.querySelector('[data-variant-data]');
      if (!script) return [];
      try {
        return JSON.parse(script.textContent);
      } catch (error) {
        return [];
      }
    }

    get selection() {
      return $$('[data-option-value][aria-checked="true"]', this)
        .sort((a, b) => Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition))
        .map((el) => el.dataset.optionValue);
    }

    onKeydown(event) {
      const current = event.target.closest('[data-option-value]');
      if (!current) return;
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();
      const group = current.closest('[data-option-group]');
      const items = $$('[data-option-value]', group);
      const index = items.indexOf(current);
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      const next = items[(index + (forward ? 1 : items.length - 1)) % items.length];
      next.focus();
      this.select(next);
    }

    select(element) {
      const group = element.closest('[data-option-group]');
      $$('[data-option-value]', group).forEach((el) => {
        el.setAttribute('aria-checked', el === element ? 'true' : 'false');
        el.tabIndex = el === element ? 0 : -1;
      });
      const nameTarget = group.querySelector('[data-option-selected]');
      if (nameTarget) nameTarget.textContent = element.dataset.optionValue;
      this.updateAvailability();
      this.commit();
    }

    matching(selection) {
      return this.variants.find((variant) =>
        variant.options.every((value, index) => selection[index] == null || value === selection[index])
      );
    }

    updateAvailability() {
      const selection = this.selection;
      this.options.forEach((group) => {
        const position = Number(group.dataset.optionGroup) - 1;
        $$('[data-option-value]', group).forEach((el) => {
          const probe = selection.slice();
          probe[position] = el.dataset.optionValue;
          const candidates = this.variants.filter((variant) =>
            variant.options.every((value, index) => index === position || probe[index] == null || value === probe[index])
          );
          const exists = candidates.some((variant) => variant.options[position] === el.dataset.optionValue);
          const available = candidates.some(
            (variant) => variant.options[position] === el.dataset.optionValue && variant.available
          );
          el.classList.toggle('is-unavailable', exists && !available);
          el.dataset.exists = exists ? 'true' : 'false';
        });
      });
    }

    commit() {
      const variant = this.variants.find((v) => v.options.join('~') === this.selection.join('~'));
      this.dispatchEvent(
        new CustomEvent('variant:change', { bubbles: true, detail: { variant: variant || null } })
      );

      if (variant && this.dataset.updateUrl !== 'false') {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }
  customElements.define('variant-picker', VariantPicker);

  /* Reacts to variant:change — price, id, button state, stock note, gallery. */
  class ProductInfo extends HTMLElement {
    connectedCallback() {
      rememberProduct(this.dataset.handle);
      this.addEventListener('variant:change', (event) => this.render(event.detail.variant));
    }

    render(variant) {
      const idField = this.querySelector('[name="id"]');
      const button = this.querySelector('[data-add-button]');
      const label = this.querySelector('[data-button-label]');
      const price = this.querySelector('[data-price]');
      const compare = this.querySelector('[data-compare-price]');
      const note = this.querySelector('[data-stock-note]');
      const sku = this.querySelector('[data-sku]');

      if (!variant) {
        if (button) button.setAttribute('aria-disabled', 'true');
        if (label) label.textContent = strings.unavailable;
        if (note) note.textContent = '';
        return;
      }

      if (idField) idField.value = variant.id;
      if (price) price.textContent = formatMoney(variant.price);
      if (compare) {
        const hasCompare = variant.compare_at_price && variant.compare_at_price > variant.price;
        compare.hidden = !hasCompare;
        if (hasCompare) compare.textContent = formatMoney(variant.compare_at_price);
      }
      if (sku) sku.textContent = variant.sku || '';

      if (button) {
        button.setAttribute('aria-disabled', variant.available ? 'false' : 'true');
        button.disabled = !variant.available;
      }
      if (label) {
        label.textContent = variant.available
          ? `${strings.addToBag}${variant.option_label ? ` — ${variant.option_label}` : ''}`
          : strings.soldOut;
      }
      if (note) note.textContent = variant.available ? variant.stock_note || '' : '';

      const buyBar = $('buy-bar');
      if (buyBar && typeof buyBar.sync === 'function') buyBar.sync(variant);

      if (variant.media_id) {
        const shot = this.ownerDocument.querySelector(`[data-media-id="${variant.media_id}"]`);
        if (shot) {
          const gallery = shot.closest('[data-gallery]');
          if (gallery && gallery.scrollWidth > gallery.clientWidth) {
            gallery.scrollTo({ left: shot.offsetLeft - gallery.offsetLeft, behavior: 'smooth' });
          } else if (!prefersReducedMotion()) {
            shot.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }
  customElements.define('product-info', ProductInfo);

  class BuyBar extends HTMLElement {
    connectedCallback() {
      const anchor = document.querySelector(this.dataset.watch || '[data-buy-anchor]');
      if (!anchor || !('IntersectionObserver' in window)) return;
      this.observer = new IntersectionObserver(
        ([entry]) => this.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0),
        { threshold: 0 }
      );
      this.observer.observe(anchor);
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
    }

    sync(variant) {
      const price = this.querySelector('[data-price]');
      const label = this.querySelector('[data-button-label]');
      const button = this.querySelector('[data-add-button]');
      const idField = this.querySelector('[name="id"]');
      if (price) price.textContent = formatMoney(variant.price);
      if (idField) idField.value = variant.id;
      if (button) {
        button.disabled = !variant.available;
        button.setAttribute('aria-disabled', variant.available ? 'false' : 'true');
      }
      if (label) label.textContent = variant.available ? strings.addToBag : strings.soldOut;
    }
  }
  customElements.define('buy-bar', BuyBar);

  /* --- Quantity stepper (product page) ------------------------------------ */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      if (!this.input) return;
      this.addEventListener('click', (event) => {
        const step = event.target.closest('[data-qty-step]');
        if (!step) return;
        event.preventDefault();
        const delta = Number(step.dataset.qtyStep);
        const min = Number(this.input.min || 1);
        const max = this.input.max ? Number(this.input.max) : Infinity;
        const next = Math.min(max, Math.max(min, (parseInt(this.input.value, 10) || min) + delta));
        this.input.value = next;
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
        this.sync();
      });
      this.input.addEventListener('change', () => this.sync());
      this.sync();
    }

    sync() {
      const value = parseInt(this.input.value, 10) || 1;
      const min = Number(this.input.min || 1);
      const max = this.input.max ? Number(this.input.max) : Infinity;
      const minus = this.querySelector('[data-qty-step="-1"]');
      const plus = this.querySelector('[data-qty-step="1"]');
      if (minus) minus.disabled = value <= min;
      if (plus) plus.disabled = value >= max;
    }
  }
  customElements.define('quantity-input', QuantityInput);

  /* --- Quick add ---------------------------------------------------------- */

  class QuickAdd extends HTMLElement {
    connectedCallback() {
      this.trigger = this.querySelector('[data-quick-trigger]');
      this.sizes = this.querySelector('[data-quick-sizes]');

      if (this.trigger) {
        this.trigger.addEventListener('click', (event) => {
          event.preventDefault();
          if (this.dataset.single === 'true') {
            this.add(this.dataset.variantId, this.trigger);
          } else {
            this.expand();
          }
        });
      }

      if (this.sizes) {
        this.sizes.addEventListener('click', (event) => {
          const button = event.target.closest('[data-variant-id]');
          if (!button || button.disabled) return;
          event.preventDefault();
          this.add(button.dataset.variantId, button);
        });
      }

      document.addEventListener('click', (event) => {
        if (!this.contains(event.target)) this.collapse();
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          this.collapse();
          if (this.trigger) this.trigger.focus();
        }
      });
    }

    expand() {
      if (!this.sizes) return;
      this.classList.add('is-open');
      this.trigger.hidden = true;
      this.sizes.hidden = false;
      const first = this.sizes.querySelector('button:not(:disabled)');
      if (first) first.focus();
    }

    collapse() {
      if (!this.sizes || this.sizes.hidden) return;
      this.classList.remove('is-open');
      this.sizes.hidden = true;
      if (this.trigger) this.trigger.hidden = false;
    }

    async add(variantId, button) {
      if (!variantId) return;
      button.disabled = true;
      try {
        await Cart.add([{ id: Number(variantId), quantity: 1 }]);
        this.collapse();
      } catch (error) {
        toast(error.message || strings.error);
      } finally {
        button.disabled = false;
      }
    }
  }
  customElements.define('quick-add', QuickAdd);

  /* --- Header navigation -------------------------------------------------- */

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      this.closeTimer = null;
      this.triggers = $$('[data-menu-trigger]', this);

      this.triggers.forEach((trigger) => {
        const panel = this.panelFor(trigger);
        if (!panel) return;

        const open = () => {
          clearTimeout(this.closeTimer);
          this.triggers.forEach((other) => {
            if (other !== trigger) this.closePanel(other);
          });
          trigger.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
        };

        const scheduleClose = () => {
          clearTimeout(this.closeTimer);
          this.closeTimer = setTimeout(() => this.closePanel(trigger), 160);
        };

        trigger.addEventListener('mouseenter', open);
        trigger.addEventListener('focus', open);
        trigger.addEventListener('mouseleave', scheduleClose);

        /* Touch and keyboard: the first tap opens rather than navigates. */
        trigger.addEventListener('click', (event) => {
          if (panel.hidden) {
            event.preventDefault();
            open();
          }
        });

        panel.addEventListener('mouseenter', () => clearTimeout(this.closeTimer));
        panel.addEventListener('mouseleave', scheduleClose);
      });

      /* Leaving the header at all closes whatever is open. */
      this.addEventListener('mouseleave', () => {
        clearTimeout(this.closeTimer);
        this.closeTimer = setTimeout(() => this.closeAll(), 160);
      });

      this.addEventListener('focusout', (event) => {
        if (!this.contains(event.relatedTarget)) this.closeAll();
      });

      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.closeAll();
      });
    }

    panelFor(trigger) {
      const id = trigger.getAttribute('aria-controls');
      return id ? this.querySelector(`#${id}`) : null;
    }

    closePanel(trigger) {
      const panel = this.panelFor(trigger);
      if (!panel) return;
      trigger.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    }

    closeAll() {
      this.triggers.forEach((trigger) => this.closePanel(trigger));
    }
  }
  customElements.define('site-header', SiteHeader);

  class MobileNav extends Overlay {
    connectedCallback() {
      super.connectedCallback();
      this.addEventListener('click', (event) => {
        const toggle = event.target.closest('[data-subnav-toggle]');
        if (!toggle) return;
        event.preventDefault();
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        const panel = this.querySelector(`#${toggle.getAttribute('aria-controls')}`);
        if (panel) panel.hidden = expanded;
      });
    }
  }
  customElements.define('mobile-nav', MobileNav);

  /* Generic openers: <button data-open="cart-drawer"> */
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (!opener) return;
    const target = $(opener.dataset.open);
    if (!target || typeof target.open !== 'function') return;
    event.preventDefault();
    target.open(opener);
  });

  /* --- Predictive search -------------------------------------------------- */

  class SearchPanel extends Overlay {
    connectedCallback() {
      super.connectedCallback();
      this.input = this.querySelector('[data-search-input]');
      this.results = this.querySelector('[data-search-results]');
      this.status = this.querySelector('[data-search-status]');
      this.selectedIndex = -1;

      if (!this.input) return;

      this.input.addEventListener(
        'input',
        debounce(() => this.search(), 220)
      );

      this.addEventListener('click', (event) => {
        const suggestion = event.target.closest('[data-suggestion]');
        if (!suggestion) return;
        event.preventDefault();
        this.input.value = suggestion.dataset.suggestion;
        this.input.focus();
        this.search();
      });

      this.input.addEventListener('keydown', (event) => this.onKeydown(event));
    }

    open(opener) {
      super.open(opener);
      if (this.input) {
        this.input.focus();
        this.input.select();
      }
    }

    onKeydown(event) {
      const items = $$('[data-search-result]', this.results || this);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!items.length) return;
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.selectedIndex = (this.selectedIndex + step + items.length) % items.length;
        items.forEach((item, index) => item.setAttribute('aria-selected', index === this.selectedIndex));
        items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && this.selectedIndex > -1 && items[this.selectedIndex]) {
        event.preventDefault();
        items[this.selectedIndex].click();
      }
    }

    async search() {
      const query = this.input.value.trim();
      this.selectedIndex = -1;

      if (query.length < 2) {
        if (this.results) this.results.innerHTML = this.dataset.defaultResults || '';
        if (this.status) this.status.textContent = this.dataset.defaultLabel || '';
        return;
      }

      if (this.status) this.status.textContent = this.dataset.loadingLabel || '';

      const url = `${routes.predictiveSearch}?q=${encodeURIComponent(query)}&resources[type]=product,collection,article&resources[limit]=6&resources[options][unavailable_products]=last&section_id=predictive-search`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('search failed');
        const text = await response.text();
        const parsed = new DOMParser().parseFromString(text, 'text/html');
        const fresh = parsed.querySelector('[data-search-results]');
        const label = parsed.querySelector('[data-search-status]');
        if (this.results && fresh) this.results.innerHTML = fresh.innerHTML;
        if (this.status) this.status.textContent = label ? label.textContent.trim() : '';
      } catch (error) {
        if (this.status) this.status.textContent = strings.error;
      }
    }
  }
  customElements.define('search-panel', SearchPanel);

  /* --- Collection facets and sort ----------------------------------------- */

  class FacetForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.grid = document.querySelector('[data-facet-target]');

      this.addEventListener('change', (event) => {
        if (event.target.matches('select, input')) this.submit();
      });

      this.addEventListener('click', (event) => {
        const link = event.target.closest('[data-facet-link]');
        if (!link) return;
        event.preventDefault();
        this.navigate(link.href);
      });

      window.addEventListener('popstate', () => this.navigate(window.location.href, true));
    }

    submit() {
      if (!this.form) return;
      const params = new URLSearchParams(new FormData(this.form));
      params.delete('page');
      const url = `${window.location.pathname}?${params.toString()}`;
      this.navigate(url);
    }

    async navigate(url, skipHistory) {
      const section = this.dataset.sectionId;
      if (!section || !this.grid) {
        window.location.href = url;
        return;
      }

      this.grid.setAttribute('aria-busy', 'true');
      const target = new URL(url, window.location.origin);
      target.searchParams.set('section_id', section);

      try {
        const response = await fetch(target.toString());
        const text = await response.text();
        const parsed = new DOMParser().parseFromString(text, 'text/html');

        const freshGrid = parsed.querySelector('[data-facet-target]');
        if (freshGrid) this.grid.innerHTML = freshGrid.innerHTML;

        const freshControls = parsed.querySelector('[data-facet-controls]');
        const controls = this.querySelector('[data-facet-controls]');
        if (freshControls && controls) controls.innerHTML = freshControls.innerHTML;

        if (!skipHistory) {
          const clean = new URL(url, window.location.origin);
          clean.searchParams.delete('section_id');
          window.history.pushState({}, '', clean.toString());
        }

        watchReveals(this.grid);
        const heading = document.querySelector('[data-facet-heading]');
        if (heading) heading.focus();
      } catch (error) {
        window.location.href = url;
      } finally {
        this.grid.removeAttribute('aria-busy');
      }
    }
  }
  customElements.define('facet-form', FacetForm);

  /* Append-the-next-page button. Keeps the real paginated links underneath. */
  class LoadMore extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('button');
      this.target = document.querySelector(this.dataset.target || '[data-facet-target] .product-grid');
      if (!this.button || !this.target) return;

      this.button.addEventListener('click', async () => {
        const next = this.dataset.nextUrl;
        if (!next) return;
        this.button.disabled = true;
        const label = this.button.textContent;
        this.button.textContent = this.dataset.loadingLabel || label;

        try {
          const url = new URL(next, window.location.origin);
          url.searchParams.set('section_id', this.dataset.sectionId);
          const response = await fetch(url.toString());
          const text = await response.text();
          const parsed = new DOMParser().parseFromString(text, 'text/html');
          const cards = parsed.querySelectorAll('[data-facet-target] .product-grid > *');
          const fragment = document.createDocumentFragment();
          cards.forEach((card) => fragment.appendChild(card));
          this.target.appendChild(fragment);
          watchReveals(this.target);

          const nextControl = parsed.querySelector('load-more');
          if (nextControl && nextControl.dataset.nextUrl) {
            this.dataset.nextUrl = nextControl.dataset.nextUrl;
          } else {
            this.remove();
            return;
          }

          const count = document.querySelector('[data-collection-count]');
          const freshCount = parsed.querySelector('[data-collection-count]');
          if (count && freshCount) count.textContent = freshCount.textContent;
        } catch (error) {
          window.location.href = this.dataset.nextUrl;
        } finally {
          this.button.disabled = false;
          this.button.textContent = label;
        }
      });
    }
  }
  customElements.define('load-more', LoadMore);

  /* --- Modal (size guide, image zoom) ------------------------------------- */

  class ModalDialog extends Overlay {}
  customElements.define('modal-dialog', ModalDialog);

  class ImageZoom extends HTMLElement {
    connectedCallback() {
      if (window.matchMedia('(hover: none)').matches) return;
      this.addEventListener('click', (event) => {
        const shot = event.target.closest('[data-zoom-src]');
        if (!shot) return;
        this.show(shot);
      });
    }

    show(shot) {
      const portal = $('#ModalPortal');
      if (!portal) return;
      const modal = document.createElement('modal-dialog');
      modal.className = 'modal-root';
      modal.innerHTML = `
        <button class="overlay" data-overlay-close type="button" aria-label="${strings.close || 'Close'}"></button>
        <div class="modal" role="dialog" aria-modal="true" aria-label="${shot.dataset.zoomAlt || ''}">
          <div class="modal__card modal__card--image" style="width:min(1100px,94vw);padding:0;">
            <img src="${shot.dataset.zoomSrc}" alt="${shot.dataset.zoomAlt || ''}" style="width:100%;height:auto;filter:var(--grade);">
          </div>
        </div>`;
      portal.appendChild(modal);
      modal.addEventListener('overlay:close', () => modal.remove());
      modal.open(shot);
    }
  }
  customElements.define('image-zoom', ImageZoom);

  /* --- Newsletter / contact forms: keep the visitor in place -------------- */

  function announceFormResult() {
    const success = $('[data-form-success]');
    if (success) {
      success.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      success.focus({ preventScroll: true });
    }
    const error = $('[data-form-error]');
    if (error) {
      error.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      error.focus({ preventScroll: true });
    }
  }

  /* --- Header bag count --------------------------------------------------- */

  Cart.subscribe((cart) => {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = cart.item_count;
    });
  });

  /* --- Boot --------------------------------------------------------------- */

  function boot() {
    watchReveals();
    announceFormResult();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Theme editor: sections are swapped in without a reload. */
  document.addEventListener('shopify:section:load', (event) => watchReveals(event.target));
  document.addEventListener('shopify:section:select', (event) => watchReveals(event.target));
})();
