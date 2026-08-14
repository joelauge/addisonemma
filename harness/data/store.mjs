/**
 * The demo catalogue. Everything the design called for, shaped the way
 * Shopify's Liquid objects are shaped, so the theme cannot tell the
 * difference.
 */

const PHOTO = (id) => `https://images.unsplash.com/photo-${id}`;

const COLOURS = {
  Chestnut: '#8C5C3D',
  Forest: '#2B3A2C',
  Navy: '#1F2A44',
  Chocolate: '#4A352A',
  'Powder blue': '#C7D5DE',
  Blush: '#E9D2CC',
  Undyed: '#D9CFBC',
  Oat: '#D5C9B1'
};

const CATALOGUE = [
  {
    handle: 'the-amboise-coat', title: 'The Amboise Coat', type: 'Outerwear',
    material: 'Waxed cotton, silk lining', price: 348000, tag: 'New',
    photos: ['1604506847073-4a8e18e07d92', '1713881587420-113c1c43e28a', '1578747522302-b987fbec4465', '1764298493197-a1c1cce57800'],
    colours: ['Chestnut', 'Forest', 'Navy', 'Chocolate'], sizes: ['XS', 'S', 'M', 'L', 'XL'],
    reference: 'no. 01',
    description: '<p>A single-breasted coat cut long enough to sit on. Dry-waxed cotton from a mill in Lancashire, lined in unbleached silk, with horn buttons turned by hand in Limoges. It will crease. That is the point.</p>',
    fit_note: 'Cut generous — take one size down.',
    composition: '<p>100% dry-waxed cotton, 12oz. Unbleached mulberry silk lining. Horn buttons turned in Limoges. Single-breasted, four-button front, deep welt pockets, back vent. Model is 178cm and wears a size S.</p>',
    care: '<p>Sponge with cold water only; never dry-clean. Send the coat to us each autumn and we will re-wax it by hand at no charge, for as long as you own it. Allow two weeks.</p>',
    makers: "<p>Cut by Sylvie Fabre, assembled by Jean-Marc Estrade and Perrine Nogaret in our workroom at Saint-Côme-d'Olt. Their initials are stitched inside the left facing.</p>",
    stock: { M: 4, L: 2 }
  },
  {
    handle: 'bellamy-cardigan', title: 'Bellamy Cardigan', type: 'Knitwear',
    material: 'Undyed cashmere', price: 118000,
    photos: ['1596433904747-e8b061219a71', '1713881842156-3d9ef36418cc'],
    colours: ['Undyed', 'Oat', 'Forest'], sizes: ['XS', 'S', 'M', 'L'],
    reference: 'no. 02',
    description: '<p>Six-ply cashmere from a herd in Inner Mongolia, knitted undyed so the colour is the goat and nothing else. Heavy enough to be worn as outerwear on a mild day.</p>',
    fit_note: 'Relaxed through the body.',
    composition: '<p>100% undyed cashmere, six-ply. Horn buttons. Ribbed cuffs and hem. Knitted in Scotland.</p>',
    care: '<p>Hand wash cool, dry flat. We de-pill and re-block any knit you send us, at no charge.</p>',
    stock: { L: 1 }
  },
  {
    handle: 'orchard-day-dress', title: 'Orchard Day Dress', type: 'Dresses',
    material: 'Washed linen', price: 164000,
    photos: ['1747396206869-75ea57b325ce', '1659297949927-06fa02629af0'],
    colours: ['Oat', 'Blush', 'Powder blue'], sizes: ['XS', 'S', 'M', 'L', 'XL'],
    reference: 'no. 03',
    description: '<p>Cut on the bias from linen washed four times before it is sewn, so it arrives already soft. Deep pockets, because a dress without pockets is a costume.</p>',
    composition: '<p>100% washed European linen. Mother-of-pearl buttons. Side seam pockets.</p>'
  },
  {
    handle: 'colette-riding-boot', title: 'Colette Riding Boot', type: 'Leather',
    material: 'Vegetable-tanned calf', price: 215000, tag: 'Last sizes',
    photos: ['1596433904493-c7ae3d6d179f', '1622532470022-24107cac5ef3'],
    colours: ['Chestnut', 'Chocolate'], sizes: ['36', '37', '38', '39', '40'],
    reference: 'no. 04',
    description: '<p>A boot made on a last first cut in 1962 and never altered. Vegetable-tanned calf over a leather sole, welted so it can be resoled for as long as you can walk.</p>',
    composition: '<p>Vegetable-tanned calf, leather lining, Goodyear-welted leather sole with a rubber top piece.</p>',
    stock: { 36: 2, 37: 1, 40: 3 }
  },
  {
    handle: 'marchand-trousers', title: 'Marchand Trousers', type: 'Trousers',
    material: 'Wool flannel', price: 89000,
    photos: ['1713881842156-3d9ef36418cc', '1740710370552-a49b5b01f80a'],
    colours: ['Navy', 'Chocolate', 'Forest'], sizes: ['XS', 'S', 'M', 'L', 'XL'],
    reference: 'no. 05',
    description: '<p>Wide, high, and pressed to a knife edge. Wool flannel milled in Huddersfield, cut with a deep hem so they can be let down twice.</p>'
  },
  {
    handle: 'the-vespers-blouse', title: 'The Vespers Blouse', type: 'Blouses',
    material: 'Silk crêpe', price: 105000,
    photos: ['1693443688057-85f57b872a3c', '1596433904500-97b901c5d274'],
    colours: ['Blush', 'Powder blue', 'Undyed'], sizes: ['XS', 'S', 'M', 'L'],
    reference: 'no. 06',
    description: '<p>Silk crêpe de chine with a collar that stands without help. Made to be worn under a coat in November and alone in June.</p>'
  },
  {
    handle: 'rosalie-scarf', title: 'Rosalie Scarf', type: 'Leather',
    material: 'Hand-rolled silk twill', price: 62000, tag: 'New',
    photos: ['1622532470022-24107cac5ef3', '1578747522302-b987fbec4465'],
    colours: ['Chestnut', 'Blush', 'Forest', 'Navy'], sizes: [],
    reference: 'no. 07',
    description: '<p>Ninety centimetres of silk twill, printed from a plate drawn in the archive in 1954, and rolled by hand along every edge.</p>'
  },
  {
    handle: 'saint-come-blazer', title: 'Saint-Côme Blazer', type: 'Outerwear',
    material: 'Donegal tweed', price: 229000,
    photos: ['1740710370552-a49b5b01f80a', '1604506847073-4a8e18e07d92'],
    colours: ['Forest', 'Chestnut'], sizes: ['XS', 'S', 'M', 'L', 'XL'],
    reference: 'no. 08',
    description: '<p>Donegal tweed flecked with every colour in the valley in October. Half-lined, soft-shouldered, and cut to be worn open.</p>',
    stock: { XS: 2 }
  },
  {
    handle: 'amelie-kid-gloves', title: 'Amélie Kid Gloves', type: 'Leather',
    material: 'Nappa, cashmere lined', price: 43000,
    photos: ['1691053318576-4bf08315e877', '1578747522302-b987fbec4465'],
    colours: ['Chocolate', 'Chestnut', 'Navy'], sizes: ['6', '6.5', '7', '7.5', '8'],
    reference: 'no. 09',
    description: '<p>Nappa kid, cashmere lined, with three points of stitching on the back of the hand. Sized to the half.</p>'
  },
  {
    handle: 'lorette-cable-jumper', title: 'Lorette Cable Jumper', type: 'Knitwear',
    material: 'Shetland lambswool', price: 76000,
    photos: ['1713881587420-113c1c43e28a', '1596433904747-e8b061219a71'],
    colours: ['Oat', 'Navy', 'Forest'], sizes: ['XS', 'S', 'M', 'L', 'XL'],
    reference: 'no. 10',
    description: '<p>A fisherman cable in Shetland lambswool, spun and knitted within forty miles of the sheep.</p>'
  },
  {
    handle: 'chapelle-wrap-dress', title: 'Chapelle Wrap Dress', type: 'Dresses',
    material: 'Wool crêpe', price: 189000,
    photos: ['1659297949927-06fa02629af0', '1747396206869-75ea57b325ce'],
    colours: ['Navy', 'Chocolate', 'Forest'], sizes: ['XS', 'S', 'M', 'L'],
    reference: 'no. 11',
    description: '<p>Wool crêpe that hangs the way jersey pretends to. A true wrap, with a belt long enough to go round twice.</p>'
  },
  {
    handle: 'tanneur-weekend-bag', title: 'Tanneur Weekend Bag', type: 'Leather',
    material: 'Bridle leather, brass', price: 268000, tag: 'Last sizes',
    photos: ['1545042746-ec9e5a59b359', '1622532470022-24107cac5ef3'],
    colours: ['Chestnut', 'Chocolate'], sizes: [],
    reference: 'no. 12',
    description: '<p>Bridle leather over a brass frame, stitched by the saddler two doors down from the workroom. It holds four days and will outlive the car.</p>',
    stock: { Default: 3 }
  }
];

const ARTICLES = [
  { handle: 'a-morning-at-the-mill', title: 'A morning at the mill that waxes our cotton', tag: 'Craft — Cloth', date: '2026-08-14', photo: '1545042746-ec9e5a59b359',
    excerpt: 'Four hundred metres of cloth pass through the wax bath each hour, watched by two men who can tell the temperature by smell alone.',
    body: `<p class="article-body__lede">The mill sits at the bottom of a valley that has smelled of paraffin since 1885, and the men who run it arrive before the light does.</p>
<p>Waxing cloth is not a delicate operation. Four hundred metres pass through the bath each hour, and the temperature must sit within two degrees of correct — too cool and the wax sits on the surface, too warm and it floods the weave and the cotton loses its breath. There is a gauge on the wall. Nobody looks at it.</p>
<p>Instead they smell it. Michael, who has worked here thirty-one years and whose father worked here before him, can name the temperature to the degree with his eyes closed. When we ask how, he says the wax goes sweet when it is right and sharp when it is not, and then he goes back to work, because the cloth does not stop.</p>
<blockquote><p>You can teach a machine the number. You cannot teach it to notice when the number is wrong.</p></blockquote>
<p>Our coats take eleven metres of this cloth apiece. It arrives in the Aveyron on a Thursday, rests a week to let the wax settle, and is cut on a Friday by a woman who has been cutting our outerwear since 1994. The finished coat is heavy in the hand, and stays that way. Re-wax it every autumn and it will outlast the person who buys it — which is, in the end, the whole argument.</p>` },
  { handle: 'the-market-at-espalion', title: 'The market at Espalion, seven in the morning', tag: 'Places — Aveyron', date: '2026-08-02', photo: '1728881652495-74fc2c4925c4',
    excerpt: 'The stalls are up before the light and down before lunch, and everything worth having has gone by half past eight.',
    body: '<p>The stalls are up before the light and down before lunch. By half past eight the good cheese has gone, and by nine the woman who sells walnuts has packed the van and driven home.</p><p>We go every Thursday. Not for research — for lunch.</p>' },
  { handle: 'a-hundred-years-of-horn', title: 'A hundred years of horn, turned by one family', tag: 'Craft — Buttons', date: '2026-07-19', photo: '1578747522302-b987fbec4465',
    excerpt: 'Every button on every coat we have made since 1931 has come from the same workshop in Limoges.',
    body: '<p>Every button on every coat we have made since 1931 has come from one workshop in Limoges, where the horn is still sorted by eye and turned on a lathe older than the road outside.</p><p>No two are the same colour. This is not a defect.</p>' },
  { handle: 'what-to-serve', title: 'What to serve when the guests stay until dark', tag: 'Table — Autumn', date: '2026-07-04', photo: '1596433904500-97b901c5d274',
    excerpt: 'Something that improves while it waits, and enough of it that nobody has to ask.',
    body: '<p>Something that improves while it waits, and enough of it that nobody has to ask twice. A shoulder of lamb, put in at four. Bread. A great deal of wine.</p>' },
  { handle: 'driving-the-back-road', title: 'Driving the back road to Cahors in the rain', tag: 'Places — Lot', date: '2026-06-21', photo: '1562636714-adbfdd55959d',
    excerpt: 'Ninety minutes longer than the motorway and worth every one of them.',
    body: '<p>Ninety minutes longer than the motorway, and worth every one of them. The hedgerows close over the road for a mile above Saint-Cirq and you drive through a green tunnel with the wipers going.</p>' },
  { handle: 'why-we-stopped-dyeing', title: 'Why we stopped dyeing our cashmere', tag: 'Craft — Knitwear', date: '2026-06-09', photo: '1596433904747-e8b061219a71',
    excerpt: 'The goats already make eleven colours. We were painting over nine of them.',
    body: '<p>The goats already make eleven colours between them. We were taking all eleven, bleaching them to one, and painting a twelfth on top. In 2019 we stopped.</p>' }
];

const PAGES = {
  maison: { title: 'The maison', content: '' },
  boutiques: { title: 'Boutiques', content: '' },
  services: { title: 'Client services', content: '' },
  saved: { title: 'Saved pieces', content: '' },
  contact: {
    title: 'Contact',
    content: `<p>Write to us at <a href="mailto:bonjour@addisonemma.example">bonjour@addisonemma.example</a>, or telephone the house on +33 5 65 44 00 12 between ten and six, Tuesday to Saturday.</p><p>The workroom is at 14 rue des Tanneurs, Saint-Côme-d'Olt, and you are welcome in it by appointment.</p>`
  },
  'size-fit': {
    title: 'Size & fit',
    content: `<p>Measurements in centimetres, taken flat. Our outerwear is cut generously over knitwear; if you are between sizes, take the smaller.</p>
<table>
<thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Back length</th></tr></thead>
<tbody>
<tr><td>XS</td><td>84</td><td>66</td><td>104</td></tr>
<tr><td>S</td><td>88</td><td>70</td><td>106</td></tr>
<tr><td>M</td><td>92</td><td>74</td><td>108</td></tr>
<tr><td>L</td><td>98</td><td>80</td><td>110</td></tr>
<tr><td>XL</td><td>104</td><td>86</td><td>112</td></tr>
</tbody></table>
<p>Still unsure? An hour with a fitter costs nothing and settles it.</p>`
  }
};

/* --- Builders ----------------------------------------------------------- */

let nextId = 1000000;
const id = () => (nextId += 7);

function media(photo, index, alt) {
  return {
    id: id(),
    media_type: 'image',
    position: index + 1,
    alt,
    preview_image: { src: PHOTO(photo), alt, width: 2400, height: 3200, aspect_ratio: 0.75 },
    src: PHOTO(photo),
    width: 2400,
    height: 3200,
    aspect_ratio: 0.75
  };
}

/** A String with a `.swatch`, so `{{ value }}` prints and `value.swatch` works. */
function optionValue(name, swatch) {
  const s = new String(name);
  s.swatch = swatch ? { color: swatch, image: null } : null;
  s.name = name;
  return s;
}

function buildProduct(def, base) {
  const url = `${base}/products/${def.handle}/`;
  const alt = `${def.title} — ${def.material}`;
  const mediaList = def.photos.map((p, i) => media(p, i, alt));

  const colours = def.colours.length ? def.colours : ['Default'];
  const sizes = def.sizes.length ? def.sizes : ['Default'];
  const hasOptions = def.colours.length > 0 || def.sizes.length > 0;

  const optionNames = [];
  if (def.colours.length) optionNames.push('Colour');
  if (def.sizes.length) optionNames.push('Size');

  const variants = [];
  for (const colour of colours) {
    for (const size of sizes) {
      const opts = [];
      if (def.colours.length) opts.push(colour);
      if (def.sizes.length) opts.push(size);

      const key = def.sizes.length ? size : 'Default';
      const stocked = def.stock && def.stock[key] !== undefined ? def.stock[key] : 12;
      const soldOut = stocked === 0;

      variants.push({
        id: id(),
        title: opts.length ? opts.join(' / ') : 'Default Title',
        options: opts.length ? opts : ['Default Title'],
        option1: opts[0] ?? 'Default Title',
        option2: opts[1] ?? null,
        available: !soldOut,
        price: def.price,
        compare_at_price: null,
        sku: `${def.reference.replace(/\D/g, '')}-${colour.slice(0, 2).toUpperCase()}-${size}`,
        inventory_management: 'shopify',
        inventory_policy: 'deny',
        inventory_quantity: stocked,
        featured_media: mediaList[0],
        url: `${url}?variant=`
      });
    }
  }

  const options_with_values = optionNames.map((name, index) => {
    const values = (name === 'Colour' ? def.colours : def.sizes).map((v) =>
      optionValue(v, name === 'Colour' ? COLOURS[v] : null)
    );
    return {
      name,
      position: index + 1,
      selected_value: String(values[0]),
      values
    };
  });

  const first = variants.find((v) => v.available) || variants[0];

  return {
    id: id(),
    handle: def.handle,
    title: def.title,
    url,
    type: def.type,
    vendor: 'Addison Emma',
    tags: def.tag ? [def.tag] : [],
    description: def.description || '',
    content: def.description || '',
    price: def.price,
    price_min: def.price,
    price_max: def.price,
    price_varies: false,
    compare_at_price: null,
    available: variants.some((v) => v.available),
    published_at: def.tag === 'New' ? '2026-08-01T09:00:00Z' : '2025-11-02T09:00:00Z',
    created_at: '2025-11-02T09:00:00Z',
    featured_media: mediaList[0],
    featured_image: mediaList[0].preview_image,
    media: mediaList,
    images: mediaList.map((m) => m.preview_image),
    options: optionNames,
    options_with_values,
    has_only_default_variant: !hasOptions,
    variants,
    selected_or_first_available_variant: first,
    selected_variant: null,
    first_available_variant: first,
    metafields: {
      custom: {
        material: { value: def.material },
        reference: { value: def.reference },
        fit_note: def.fit_note ? { value: def.fit_note } : null,
        badge: def.tag ? { value: def.tag } : null,
        composition: def.composition ? { value: def.composition } : null,
        care: def.care ? { value: def.care } : null,
        makers: def.makers ? { value: def.makers } : null
      }
    }
  };
}

function buildArticle(def, base, blogHandle) {
  const alt = def.title;
  return {
    id: id(),
    handle: def.handle,
    title: def.title,
    url: `${base}/blogs/${blogHandle}/${def.handle}/`,
    author: 'Céleste Marchand',
    published_at: `${def.date}T08:00:00Z`,
    created_at: `${def.date}T08:00:00Z`,
    tags: [def.tag],
    excerpt: def.excerpt,
    excerpt_or_content: def.excerpt,
    content: def.body,
    image: { src: PHOTO(def.photo), alt, width: 2400, height: 1600, aspect_ratio: 1.5 },
    comments_count: 0,
    comments: [],
    comment_post_url: '#'
  };
}

/* --- Assembly ----------------------------------------------------------- */

export function buildStore(base) {
  const products = CATALOGUE.map((def) => buildProduct(def, base));
  const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));

  const makeCollection = (handle, title, filter, description, image) => {
    const items = products.filter(filter);
    return {
      id: id(),
      handle,
      title,
      url: `${base}/collections/${handle}/`,
      description,
      products: items,
      all_products_count: items.length,
      products_count: items.length,
      featured_image: image ? { src: PHOTO(image), alt: title, width: 1600, height: 2000, aspect_ratio: 0.8 } : null,
      image: null,
      sort_by: null,
      default_sort_by: 'manual',
      sort_options: [
        { value: 'manual', name: 'Featured' },
        { value: 'price-ascending', name: 'Price ascending' },
        { value: 'price-descending', name: 'Price descending' },
        { value: 'created-descending', name: 'Newest' }
      ],
      filters: [],
      all_tags: []
    };
  };

  const categories = ['Outerwear', 'Knitwear', 'Dresses', 'Leather', 'Trousers', 'Blouses'];
  const collections = [
    makeCollection('all', 'The Long Afternoon', () => true,
      '<p>Forty-two pieces, cut from eleven cloths. Each is made in a single run and not repeated — when a size goes, it goes.</p>',
      '1625158244856-e5e20f733c1f'),
    ...categories.map((cat) =>
      makeCollection(cat.toLowerCase(), cat, (p) => p.type === cat,
        `<p>Every ${cat.toLowerCase()} piece in the Autumn — Winter 2026 collection.</p>`,
        CATALOGUE.find((d) => d.type === cat)?.photos[0])
    )
  ];

  // Category pills, modelled as Shopify filters but pointing at real pages —
  // so on static hosting they are ordinary links that already work.
  const filterValues = categories.map((cat) => {
    const target = collections.find((c) => c.handle === cat.toLowerCase());
    return {
      label: cat,
      value: cat,
      count: target.products.length,
      active: false,
      url_to_add: target.url,
      url_to_remove: `${base}/collections/all/`
    };
  });

  for (const collection of collections) {
    collection.filters = [
      {
        label: 'Category',
        type: 'list',
        param_name: 'filter.p.product_type',
        active_values: collection.handle === 'all' ? [] : [{ label: collection.title }],
        values: filterValues.map((v) => ({ ...v, active: v.value.toLowerCase() === collection.handle }))
      }
    ];
  }

  const blog = {
    id: id(),
    handle: 'journal',
    title: 'Letters from the valley',
    url: `${base}/blogs/journal/`,
    articles: ARTICLES.map((a) => buildArticle(a, base, 'journal')),
    articles_count: ARTICLES.length,
    all_tags: [...new Set(ARTICLES.map((a) => a.tag.split(' — ')[0]))],
    comments_enabled: false,
    comments_enabled_q: false
  };

  const pages = Object.fromEntries(
    Object.entries(PAGES).map(([handle, p]) => [
      handle,
      { handle, title: p.title, url: `${base}/pages/${handle}/`, content: p.content }
    ])
  );

  return { products, byHandle, collections, blog, pages, categories };
}

export { COLOURS, CATALOGUE };
