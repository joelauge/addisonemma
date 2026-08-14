/**
 * Shopify's Liquid tags that liquidjs does not ship: section, sections,
 * schema, paginate, form, style, javascript, layout.
 */

import fs from 'node:fs';
import path from 'node:path';

/* --- {% schema %} — capture and discard --------------------------------- */

export const schemaTag = {
  parse(token, remainTokens) {
    while (remainTokens.length) {
      const t = remainTokens.shift();
      if (t.name === 'endschema') return;
    }
  },
  render() {
    return '';
  }
};

/* --- {% layout none %} — the harness always supplies its own ------------ */

export const layoutTag = { parse() {}, render: () => '' };

/* --- {% style %} / {% javascript %} ------------------------------------- */

function blockTag(endName, wrap) {
  return {
    parse(token, remainTokens) {
      this.templates = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on(`tag:${endName}`, () => stream.stop())
        .on('template', (tpl) => this.templates.push(tpl))
        .on('end', () => {
          throw new Error(`${token.getText()} not closed`);
        });
      stream.start();
    },
    *render(ctx, emitter) {
      const body = yield this.liquid.renderer.renderTemplates(this.templates, ctx);
      emitter.write(wrap(body));
    }
  };
}

export const styleTag = blockTag('endstyle', (b) => `<style>${b}</style>`);
export const javascriptTag = blockTag('endjavascript', (b) => `<script>${b}</script>`);

/* --- Schema helper ------------------------------------------------------ */

export function readSchema(source) {
  const match = source.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

/* --- {% section %} / {% sections %} ------------------------------------- */

export function makeSectionTags({ themeDir, buildSectionContext, onError }) {
  function* renderOne(liquid, ctx, type, sectionId, config) {
    const file = path.join(themeDir, 'sections', `${type}.liquid`);
    if (!fs.existsSync(file)) return `<!-- missing section: ${type} -->`;

    const source = fs.readFileSync(file, 'utf8');
    const schema = readSchema(source);
    const section = buildSectionContext({ type, id: sectionId, config, schema });

    let rendered;
    const scope = ctx.getAll();
    try {
      rendered = yield liquid.parseAndRender(source, { ...scope, section }, { globals: { ...scope, section } });
    } catch (error) {
      onError?.(type, error);
      rendered = `<!-- section ${type} failed: ${String(error.message).slice(0, 200)} -->`;
    }

    const tag = schema.tag || 'div';
    const cls = ['shopify-section', schema.class].filter(Boolean).join(' ');
    return `<${tag} id="shopify-section-${sectionId}" class="${cls}">${rendered}</${tag}>`;
  }

  const sectionTag = {
    parse(token) {
      this.name = token.args.trim().replace(/^["']|["']$/g, '');
    },
    *render(ctx) {
      return yield renderOne(this.liquid, ctx, this.name, this.name, null);
    }
  };

  const sectionsTag = {
    parse(token) {
      this.group = token.args.trim().replace(/^["']|["']$/g, '');
    },
    *render(ctx) {
      const file = path.join(themeDir, 'sections', `${this.group}.json`);
      if (!fs.existsSync(file)) return '';
      const group = JSON.parse(fs.readFileSync(file, 'utf8'));
      const order = group.order || Object.keys(group.sections || {});
      let out = '';
      for (const sectionId of order) {
        const config = group.sections[sectionId];
        if (!config) continue;
        out += yield renderOne(this.liquid, ctx, config.type, sectionId, config);
      }
      return out;
    }
  };

  return { sectionTag, sectionsTag, renderOne };
}

/* --- {% paginate x by n %} ---------------------------------------------- */

/**
 * The route pre-slices the collection and supplies `__pagination`; this tag
 * only has to expose it as `paginate`. That keeps page counts and URLs exact
 * for static output, where a `?page=2` query string means nothing.
 */
export const paginateTag = {
  parse(token, remainTokens) {
    this.templates = [];
    const stream = this.liquid.parser.parseStream(remainTokens);
    stream
      .on('tag:endpaginate', () => stream.stop())
      .on('template', (tpl) => this.templates.push(tpl))
      .on('end', () => {
        throw new Error('{% paginate %} not closed');
      });
    stream.start();
  },

  *render(ctx, emitter) {
    const supplied = ctx.getSync(['__pagination']);
    const paginate = supplied || {
      items: 0, current_page: 1, current_offset: 0, pages: 1, page_size: 20,
      parts: [], previous: null, next: null
    };
    ctx.push({ paginate });
    const out = yield this.liquid.renderer.renderTemplates(this.templates, ctx);
    ctx.pop();
    emitter.write(out);
  }
};

/* --- {% form 'type', object, attrs %} ----------------------------------- */

/** Splits on commas that are not inside quotes. */
function splitArgs(input) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of input) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function makeFormTag({ formAction }) {
  return {
    parse(token, remainTokens) {
      this.args = token.args;
      this.templates = [];
      const stream = this.liquid.parser.parseStream(remainTokens);
      stream
        .on('tag:endform', () => stream.stop())
        .on('template', (tpl) => this.templates.push(tpl))
        .on('end', () => {
          throw new Error('{% form %} not closed');
        });
      stream.start();
    },

    *render(ctx, emitter) {
      const parts = splitArgs(this.args);
      const type = String(parts.shift() || '').replace(/^["']|["']$/g, '');

      const attrs = {};
      for (const part of parts) {
        const named = part.match(/^([A-Za-z_][\w-]*)\s*:\s*([\s\S]+)$/);
        if (!named) continue; // a bare positional argument — nothing to emit
        try {
          attrs[named[1]] = yield this.liquid.evalValue(named[2], ctx);
        } catch {
          /* an attribute we cannot evaluate is not worth failing a page over */
        }
      }

      const form = {
        posted_successfully: false,
        posted_successfully_q: false,
        errors: null,
        author: '',
        email: '',
        body: '',
        country: 'France'
      };

      ctx.push({ form });
      const inner = yield this.liquid.renderer.renderTemplates(this.templates, ctx);
      ctx.pop();

      const attrString = Object.entries(attrs)
        .filter(([, v]) => v !== undefined && v !== null && v !== false)
        .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
        .join('');

      emitter.write(
        `<form method="post" action="${formAction(type)}" accept-charset="UTF-8"${attrString} data-demo-form="${type}">` +
          `<input type="hidden" name="form_type" value="${type}">` +
          inner +
          `</form>`
      );
    }
  };
}
