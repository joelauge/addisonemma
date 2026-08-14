/**
 * Photography for the preview's image_picker settings, so the harness shows
 * the design rather than a grid of placeholder mountains.
 *
 * Keys are `sectionId.settingId` first, then `sectionType.settingId`, then
 * `sectionId.blockId.settingId` for blocks.
 */

const PHOTO = (id, w = 2400, h = 1600) => ({
  src: `https://images.unsplash.com/photo-${id}`,
  alt: '',
  width: w,
  height: h,
  aspect_ratio: w / h
});

const MAP = {
  /* Home */
  'hero.image': PHOTO('1625158244856-e5e20f733c1f', 2400, 1500),
  'house_code.image': PHOTO('1658251007077-cbf0edfe1a2f', 2400, 1400),
  'atelier.image': PHOTO('1596433904500-97b901c5d274', 1600, 2000),

  /* Product */
  'story.image': PHOTO('1622532470022-24107cac5ef3', 1600, 1800),

  /* Maison */
  'archive.one.image': PHOTO('1596433904500-97b901c5d274', 1600, 2000),
  'archive.two.image': PHOTO('1740710370552-a49b5b01f80a', 1600, 2000),
  'archive.three.image': PHOTO('1604506847073-4a8e18e07d92', 1600, 2000),

  /* Boutiques */
  'main.stcome.image': PHOTO('1764298493197-a1c1cce57800', 1600, 1000),
  'main.paris.image': PHOTO('1740710370552-a49b5b01f80a', 1600, 1000),
  'main.london.image': PHOTO('1604506847073-4a8e18e07d92', 1600, 1000),
  'main.newyork.image': PHOTO('1578747522302-b987fbec4465', 1600, 1000),

  /* Chrome */
  'header.promo_image': PHOTO('1747396206869-75ea57b325ce', 1200, 900),

  /* Fallbacks by section type */
  'hero': PHOTO('1700317440744-a126fc87b900', 2400, 1500),
  'image-quote': PHOTO('1658251007077-cbf0edfe1a2f', 2400, 1400),
  'split-feature': PHOTO('1596433904500-97b901c5d274', 1600, 2000),
  'image-trio': PHOTO('1740710370552-a49b5b01f80a', 1600, 2000),
  'boutiques': PHOTO('1764298493197-a1c1cce57800', 1600, 1000),
  'main-password': PHOTO('1625158244856-e5e20f733c1f', 2400, 1500)
};

/** The maison page's hero wants its own photograph, not the campaign shot. */
MAP['hero.image#page.maison'] = PHOTO('1700317440744-a126fc87b900', 2400, 1500);

export function imageFor({ sectionId, sectionType, settingId, blockId, template }) {
  const candidates = [
    blockId ? `${sectionId}.${blockId}.${settingId}` : null,
    blockId ? `${sectionType}.${blockId}.${settingId}` : null,
    template ? `${sectionId}.${settingId}#${template}` : null,
    `${sectionId}.${settingId}`,
    `${sectionType}.${settingId}`,
    sectionType
  ].filter(Boolean);

  for (const key of candidates) {
    if (MAP[key]) return MAP[key];
  }
  return null;
}
