import { useEffect, useState } from 'react'
import { resolveMedia } from '../lib/media'

/* Resolves a media ref (`https://…` or `local:<id>`) to a displayable src.
   Object URLs created for local blobs are revoked on unmount. */
export default function MediaImage({ src: ref, alt = '', className = '', ...rest }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let alive = true

    resolveMedia(ref).then((resolved) => {
      if (!alive) {
        if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved)
        return
      }
      if (resolved.startsWith('blob:')) objectUrl = resolved
      setSrc(resolved)
    })

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [ref])

  if (!src) {
    return (
      <div
        className={`bg-parchment/60 ${className}`}
        aria-label={alt}
        role="img"
        {...rest}
      />
    )
  }

  return <img src={src} alt={alt} loading="lazy" className={className} {...rest} />
}
