import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { streamChat, loadChat, saveChat, clearChat } from '../lib/chat'
import ChatMarkdown from './ChatMarkdown'
import { Compass, Globe, Search } from './Icons'
import { EASE } from './Form'

/* The chat surface, used twice: as the standalone tab (scope "general") and
   embedded in a trip's planning page (scope "trip:<id>"), where the trip is
   passed along so the model knows what "there" means. */

function Bubble({ role, children }) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          mine
            ? 'rounded-br-sm bg-emerald text-cream'
            : 'card-paper texture-paper rounded-bl-sm'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export default function TravelChat({ scope, trip, compact = false, placeholder }) {
  const [messages, setMessages] = useState(() => loadChat(scope))
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [searching, setSearching] = useState(null)
  const [error, setError] = useState(null)

  const abortRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => saveChat(scope, messages), [scope, messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  // Abort an in-flight request if the component goes away mid-answer.
  useEffect(() => () => abortRef.current?.(), [])

  const send = useCallback(() => {
    const text = draft.trim()
    if (!text || streaming) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setDraft('')
    setError(null)
    setStreaming(true)

    // The assistant turn is appended empty and filled in as deltas arrive.
    setMessages((m) => [...m, { role: 'assistant', content: '', sources: [] }])

    const patchLast = (patch) =>
      setMessages((m) => {
        const copy = [...m]
        const last = copy[copy.length - 1]
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { ...last, ...patch(last) }
        }
        return copy
      })

    abortRef.current = streamChat({
      messages: next,
      trip: trip
        ? {
            name: trip.name,
            destination: trip.destination,
            region: trip.region,
            start_date: trip.start_date,
            end_date: trip.end_date,
            traveled_with: trip.traveled_with,
            status: trip.status,
          }
        : null,
      onText: (t) => {
        setSearching(null)
        patchLast((last) => ({ content: last.content + t }))
      },
      onSearching: (q) => setSearching(q || 'the web'),
      onSources: (sources) => patchLast(() => ({ sources })),
      onError: (message) => {
        setError(message)
        // Drop the empty assistant turn so the transcript isn't left with a
        // blank bubble above the error.
        setMessages((m) => {
          const last = m[m.length - 1]
          return last?.role === 'assistant' && !last.content ? m.slice(0, -1) : m
        })
      },
      onDone: () => {
        setStreaming(false)
        setSearching(null)
        abortRef.current = null
      },
    })
  }, [draft, messages, streaming, trip])

  const reset = () => {
    abortRef.current?.()
    clearChat(scope)
    setMessages([])
    setError(null)
    setStreaming(false)
  }

  return (
    <div className={compact ? '' : 'flex min-h-[60vh] flex-col'}>
      <div className={`flex flex-col gap-3 ${compact ? '' : 'flex-1'}`}>
        {messages.length === 0 && !streaming && (
          <div className="rounded-lg border border-dashed border-gold/30 px-5 py-8 text-center">
            <Globe className="mx-auto h-7 w-7 text-gold/70" />
            <p className="mt-3 font-display text-xl text-cream/85">
              {trip ? `Ask about ${trip.name}` : 'Ask me anything'}
            </p>
            <p className="mt-1 font-sans text-[11px] leading-relaxed text-cream/70">
              {trip
                ? 'Weather, what to pack, what to book — scoped to this trip.'
                : 'Where to go, when to go, what it costs. I can search the web for current details.'}
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            <div
              className={`font-sans text-[14px] leading-relaxed ${
                m.role === 'user' ? 'whitespace-pre-wrap text-cream' : 'text-navy-deep'
              }`}
            >
              {m.role === 'user' ? m.content : <ChatMarkdown text={m.content} />}
              {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-emerald align-middle" />
              )}
            </div>

            {m.sources?.length > 0 && (
              <div className="mt-3 border-t border-emerald/15 pt-2">
                <p className="font-sans text-[8px] tracking-stamp text-emerald uppercase">
                  Sources
                </p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {m.sources.slice(0, 5).map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-sans text-[11px] text-emerald underline decoration-emerald/30"
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Bubble>
        ))}

        <AnimatePresence>
          {searching && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-1"
            >
              <Search className="h-3.5 w-3.5 animate-pulse text-gold-light" />
              <span className="truncate font-sans text-[11px] text-cream/70">
                Searching {searching}…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {streaming && !searching && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 px-1">
            <Compass className="animate-compass h-4 w-4 text-gold/70" />
            <span className="font-sans text-[11px] text-cream/70">Thinking…</span>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-burgundy/50 bg-burgundy/20 px-4 py-2.5 font-sans text-[12px] text-cream">
            {error}
          </p>
        )}

        <div ref={endRef} />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={placeholder ?? (trip ? 'Ask about this trip…' : 'Ask about anywhere…')}
          className="max-h-32 min-h-[46px] flex-1 resize-none rounded-lg border border-gold/25 bg-cream/10 px-4 py-3 font-sans text-[15px] text-cream outline-none placeholder:text-cream/45 focus:border-gold/60"
        />
        <motion.button
          type="button"
          onClick={streaming ? () => abortRef.current?.() : send}
          whileTap={{ scale: 0.94 }}
          disabled={!streaming && !draft.trim()}
          aria-label={streaming ? 'Stop' : 'Send'}
          className="flex h-[46px] shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-emerald px-4 font-sans text-[10px] tracking-stamp text-gold-light uppercase transition-opacity disabled:opacity-35"
        >
          {streaming ? 'Stop' : 'Ask'}
        </motion.button>
      </div>

      {messages.length > 0 && (
        <button
          type="button"
          onClick={reset}
          className="mt-3 self-center font-sans text-[9px] tracking-stamp text-cream/60 uppercase"
        >
          Clear conversation
        </button>
      )}
    </div>
  )
}
