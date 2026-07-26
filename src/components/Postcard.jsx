import { useState } from 'react'
import { motion } from 'framer-motion'
import MediaImage from './MediaImage'
import { Pin } from './Icons'

/* Tap to flip. A real CSS 3D transform on a preserve-3d container — the two
   faces are the same element, not a crossfade between two images. */

export default function Postcard({ postcard, onEdit }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="[perspective:1200px]">
      <motion.div
        className="relative aspect-[3/2] w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Show postcard front' : 'Show postcard back'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
      >
        {/* Front */}
        <div className="absolute inset-0 overflow-hidden rounded-md [backface-visibility:hidden] shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)]">
          <MediaImage
            src={postcard.front_url}
            alt={postcard.location || 'Postcard front'}
            className="h-full w-full object-cover"
          />
          {postcard.location && (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-emerald-deep/80 to-transparent px-3 pt-6 pb-2">
              <Pin className="h-3 w-3 text-gold-light" />
              <span className="truncate font-sans text-[10px] text-cream">
                {postcard.location}
              </span>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="card-paper texture-paper absolute inset-0 overflow-hidden rounded-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {postcard.back_url ? (
            <MediaImage
              src={postcard.back_url}
              alt="Postcard back"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full">
              <p className="flex-1 overflow-y-auto px-3 py-3 font-display text-[15px] leading-snug text-navy-deep italic">
                {postcard.back_note || 'No note on this one.'}
              </p>
              {/* The divider and stamp box of a real postcard back */}
              <div className="w-px bg-emerald/15" />
              <div className="flex w-1/3 items-start justify-center pt-3">
                <div className="h-10 w-8 rounded-[2px] border border-dashed border-emerald/30" />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => onEdit(postcard)}
        className="mt-1.5 w-full text-center font-sans text-[9px] tracking-stamp text-gold-light/85 uppercase"
      >
        Edit
      </button>
    </div>
  )
}
