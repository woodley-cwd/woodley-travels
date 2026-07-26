import { useRef, useState } from 'react'
import { saveImage, deleteImage } from '../lib/media'
import MediaImage from './MediaImage'
import { Camera, Trash, Compass } from './Icons'

/* A single image slot. Compresses and stores on pick; hands the caller back a
   media ref to persist on the row. */
export default function PhotoInput({ value, onChange, label = 'Photo', aspect = 'aspect-[4/3]' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked after a removal
    if (!file) return

    setBusy(true)
    try {
      const ref = await saveImage(file)
      onChange(ref)
    } catch {
      // A non-image or a decode failure — leave the slot as it was.
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    const old = value
    onChange('')
    await deleteImage(old)
  }

  return (
    <div>
      <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
        {label}
      </span>

      <div className={`relative mt-1.5 overflow-hidden rounded-md border border-emerald/20 ${aspect}`}>
        {value ? (
          <>
            <MediaImage src={value} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={clear}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-deep/75 text-cream backdrop-blur-sm"
            >
              <Trash className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-ivory/60 text-emerald/85"
          >
            {busy ? (
              <Compass className="animate-compass h-6 w-6 text-gold/60" />
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span className="font-sans text-[9px] tracking-stamp uppercase">Add {label}</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={pick}
        className="hidden"
      />
    </div>
  )
}
