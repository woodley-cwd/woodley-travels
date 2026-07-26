import { Fragment } from 'react'

/* A deliberately tiny renderer for the small subset of Markdown the model
   actually produces in chat: bold spans and dash/asterisk bullets.

   A full Markdown library would be a large dependency for a personal app, and
   rendering arbitrary HTML from model output is a footgun. This only ever
   emits React elements — nothing is parsed as HTML, so there's no injection
   surface. Anything it doesn't recognise falls through as literal text. */

function inline(text, keyPrefix) {
  // Split on **bold**, keeping the captured inner text.
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-b${i}`} className="font-semibold">
        {part}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>
    )
  )
}

export default function ChatMarkdown({ text, className = '' }) {
  const lines = (text ?? '').split('\n')

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span aria-hidden className="select-none opacity-60">
                ·
              </span>
              <span className="flex-1">{inline(bullet[1], i)}</span>
            </div>
          )
        }
        // Preserve intentional blank lines as spacing rather than collapsing
        // paragraphs together.
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <div key={i}>{inline(line, i)}</div>
      })}
    </div>
  )
}
