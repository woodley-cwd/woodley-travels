/* A wax-and-foil seal. Earned seals get the full gold gradient and a rosette
   edge; unearned ones sit as a faint engraved outline so the shelf reads as a
   set to complete rather than a wall of blanks. */

export default function BadgeSeal({ size = 56, earned = false, label }) {
  const id = earned ? 'sealGold' : 'sealDim'

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={label}>
      <defs>
        <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8F6F1C" />
          <stop offset="35%" stopColor="#E2C569" />
          <stop offset="55%" stopColor="#F4E3A8" />
          <stop offset="100%" stopColor="#A8862F" />
        </linearGradient>
        <linearGradient id="sealDim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(201,162,39,0.22)" />
          <stop offset="100%" stopColor="rgba(201,162,39,0.10)" />
        </linearGradient>
      </defs>

      {/* Rosette edge */}
      <g fill={`url(#${id})`}>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2
          return (
            <circle
              key={i}
              cx={50 + Math.cos(a) * 41}
              cy={50 + Math.sin(a) * 41}
              r={5.2}
            />
          )
        })}
      </g>

      <circle cx="50" cy="50" r="41" fill={`url(#${id})`} />
      <circle
        cx="50"
        cy="50"
        r="33"
        fill="none"
        stroke={earned ? 'rgba(11,59,50,0.55)' : 'rgba(11,59,50,0.3)'}
        strokeWidth="1.2"
      />

      {/* Compass star at the centre */}
      <path
        d="M50 26 L56 44 L74 50 L56 56 L50 74 L44 56 L26 50 L44 44 Z"
        fill={earned ? 'rgba(11,59,50,0.72)' : 'rgba(11,59,50,0.35)'}
      />
    </svg>
  )
}
