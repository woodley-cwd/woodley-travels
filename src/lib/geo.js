import { feature } from 'topojson-client'
import { geoPath, geoNaturalEarth1 } from 'd3-geo'

/* Map geometry.

   The atlases are ~800KB combined, so they're dynamically imported — the code
   only loads when the Maps screen is first opened, and the service worker
   caches it from then on.

   US data is pre-projected (Albers USA, with Alaska and Hawaii inset), so it
   renders with an identity path. World data is raw lat/lon and gets a Natural
   Earth projection, which keeps the jewel-toned continents shapely rather than
   stretching them the way Mercator would. */

// Name aliases and off-map territories live in places.js, so screens that only
// need naming don't pull in d3-geo. Re-exported for existing callers.
export { toAtlasName, NOT_ON_MAP } from './places'

const WORLD_SIZE = { width: 900, height: 450 }

let usCache
let worldCache

export async function loadUsMap() {
  usCache ??= (async () => {
    const mod = await import('us-atlas/states-albers-10m.json')
    const topo = mod.default ?? mod
    const fc = feature(topo, topo.objects.states)
    const path = geoPath() // already projected

    /* The viewBox comes from the atlas's own bbox, not the conventional
       "0 0 975 610" — this projection places the Aleutian tail at a negative
       x, which that viewBox would clip clean off the left edge. */
    const [x0, y0, x1, y1] = topo.bbox
    const pad = 6

    return {
      viewBox: `${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`,
      regions: fc.features
        .map((f) => ({ name: f.properties.name, d: path(f) }))
        .filter((r) => r.d),
    }
  })()
  return usCache
}

export async function loadWorldMap() {
  worldCache ??= (async () => {
    const mod = await import('world-atlas/countries-50m.json')
    const topo = mod.default ?? mod
    const fc = feature(topo, topo.objects.countries)

    // Antarctica spans the entire bottom of the projection and would squash
    // everything else if it were included in the fit.
    const drawn = {
      type: 'FeatureCollection',
      features: fc.features.filter((f) => f.properties.name !== 'Antarctica'),
    }

    const projection = geoNaturalEarth1().fitSize(
      [WORLD_SIZE.width, WORLD_SIZE.height],
      drawn
    )
    const path = geoPath(projection)

    return {
      viewBox: `0 0 ${WORLD_SIZE.width} ${WORLD_SIZE.height}`,
      regions: drawn.features
        .map((f) => ({ name: f.properties.name, d: path(f) }))
        .filter((r) => r.d),
    }
  })()
  return worldCache
}
