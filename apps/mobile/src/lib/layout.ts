/**
 * When the screen is wide enough for the tablet layout: navigation in a side
 * column and list and detail side by side.
 *
 * It is a WIDTH decision, not a device one: an iPad window at half width is a
 * phone-shaped space and gets the phone layout, and a large tablet gets the
 * wide layout in both orientations. 768pt keeps the iPad mini in portrait
 * (744pt) on the phone layout, where two panes would each be too narrow to
 * read, and moves every full-size tablet to the wide one.
 *
 * Imports nothing, so `node --test` can load it.
 */
export const LARGHEZZA_LAYOUT_LARGO = 768;

export function layoutLargo(larghezza: number): boolean {
  return larghezza >= LARGHEZZA_LAYOUT_LARGO;
}

/**
 * When list and detail fit side by side: the sidebar (240), the list (360)
 * and a detail of at least 400pt, wide enough for a chat or a post. Below
 * that the wide layout keeps one column, and a detail opens as its own
 * screen: on an 11" iPad in portrait two panes would leave the detail about
 * 230pt, narrower than a phone.
 */
export const LARGHEZZA_DUE_PANNELLI = 1000;

export function duePannelli(larghezza: number): boolean {
  return larghezza >= LARGHEZZA_DUE_PANNELLI;
}
