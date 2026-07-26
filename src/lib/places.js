// Reference lists for the destination picker. Kept local so the app resolves
// state/country names with no network round-trip.

export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
  ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['PR', 'Puerto Rico'],
  ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'],
  ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
]

export const COUNTRIES = [
  ['AR', 'Argentina'], ['AU', 'Australia'], ['AT', 'Austria'], ['BS', 'Bahamas'],
  ['BB', 'Barbados'], ['BE', 'Belgium'], ['BZ', 'Belize'], ['BR', 'Brazil'],
  ['CA', 'Canada'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'],
  ['CR', 'Costa Rica'], ['HR', 'Croatia'], ['CU', 'Cuba'], ['CZ', 'Czechia'],
  ['DK', 'Denmark'], ['DO', 'Dominican Republic'], ['EC', 'Ecuador'], ['EG', 'Egypt'],
  ['FJ', 'Fiji'], ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'],
  ['GH', 'Ghana'], ['GR', 'Greece'], ['GT', 'Guatemala'], ['IS', 'Iceland'],
  ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Ireland'], ['IL', 'Israel'],
  ['IT', 'Italy'], ['JM', 'Jamaica'], ['JP', 'Japan'], ['JO', 'Jordan'],
  ['KE', 'Kenya'], ['MY', 'Malaysia'], ['MV', 'Maldives'], ['MT', 'Malta'],
  ['MX', 'Mexico'], ['MA', 'Morocco'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'],
  ['NO', 'Norway'], ['PA', 'Panama'], ['PE', 'Peru'], ['PH', 'Philippines'],
  ['PL', 'Poland'], ['PT', 'Portugal'], ['QA', 'Qatar'], ['RO', 'Romania'],
  ['RW', 'Rwanda'], ['SA', 'Saudi Arabia'], ['SG', 'Singapore'], ['ZA', 'South Africa'],
  ['KR', 'South Korea'], ['ES', 'Spain'], ['LK', 'Sri Lanka'], ['SE', 'Sweden'],
  ['CH', 'Switzerland'], ['TW', 'Taiwan'], ['TZ', 'Tanzania'], ['TH', 'Thailand'],
  ['TT', 'Trinidad and Tobago'], ['TR', 'Türkiye'], ['AE', 'United Arab Emirates'],
  ['GB', 'United Kingdom'], ['UY', 'Uruguay'], ['VN', 'Vietnam'],
]

const nameByCode = (list) => Object.fromEntries(list.map(([c, n]) => [c, n]))

const STATE_NAMES = nameByCode(US_STATES)
const COUNTRY_NAMES = nameByCode(COUNTRIES)

export function regionName(scope, code) {
  if (!code) return ''
  return (scope === 'international' ? COUNTRY_NAMES : STATE_NAMES)[code] ?? code
}

/* Natural Earth spells a couple of these differently than the passport does.
   Lives here rather than in geo.js so callers can use it without pulling in
   d3-geo and the topojson client. */
const ATLAS_ALIASES = {
  'Dominican Republic': 'Dominican Rep.',
  'Türkiye': 'Turkey',
}

export const toAtlasName = (name) => ATLAS_ALIASES[name] ?? name

/* Territories that legitimately have no polygon in the atlas. They still count
   toward stats — the map just can't draw them, and callers surface them
   separately rather than dropping them silently. */
export const NOT_ON_MAP = new Set(['Puerto Rico'])

// Flag emoji from an ISO alpha-2 code, via regional indicator symbols.
export function flagEmoji(code) {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}
