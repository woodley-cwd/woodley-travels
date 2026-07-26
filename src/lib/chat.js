/* Client half of the travel chat.

   Talks to /api/chat, which holds the API key. Nothing here knows or needs a
   credential — that's the whole point of the proxy. */

const ENDPOINT = '/api/chat'

/* Reads the SSE stream and invokes callbacks as events arrive.
   Returns a function that aborts the in-flight request. */
export function streamChat({ messages, trip, onText, onSearching, onSources, onDone, onError }) {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, trip }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        // The error path returns JSON, not SSE.
        let message = `Request failed (${res.status})`
        try {
          const body = await res.json()
          if (body?.error) message = body.error
        } catch {
          // non-JSON body; keep the status message
        }
        onError?.(message)
        onDone?.()
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line. A partial frame stays in
        // the buffer until the rest of it arrives.
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          let event = 'message'
          let data = ''
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7).trim()
            else if (line.startsWith('data: ')) data += line.slice(6)
          }
          if (!data) continue

          let payload
          try {
            payload = JSON.parse(data)
          } catch {
            continue
          }

          if (event === 'text') onText?.(payload.text)
          else if (event === 'searching') onSearching?.(payload.query)
          else if (event === 'sources') onSources?.(payload.sources)
          else if (event === 'error') onError?.(payload.message)
          else if (event === 'done') onDone?.(payload)
        }
      }
      onDone?.()
    } catch (err) {
      if (err?.name === 'AbortError') return // caller stopped it on purpose
      onError?.(
        navigator.onLine
          ? 'Something went wrong reaching the travel assistant.'
          : "You're offline — the travel chat needs a connection."
      )
      onDone?.()
    }
  })()

  return () => controller.abort()
}

/* Conversations are kept per-scope: one for the standalone tab, one per trip.
   They're local-only — chat history never goes to Supabase. */
const key = (scope) => `wt.chat.${scope}.v1`

export function loadChat(scope) {
  try {
    return JSON.parse(localStorage.getItem(key(scope))) ?? []
  } catch {
    return []
  }
}

export function saveChat(scope, messages) {
  // Keep the tail only — long transcripts cost tokens on every turn and fill
  // localStorage.
  localStorage.setItem(key(scope), JSON.stringify(messages.slice(-40)))
}

export const clearChat = (scope) => localStorage.removeItem(key(scope))
