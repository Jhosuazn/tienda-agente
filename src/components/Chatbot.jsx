import { useEffect, useRef, useState } from 'react'
import { Bot, MessageSquare, RotateCcw, Send, X } from 'lucide-react'
import { AGENT_CONTEXTS, buildSystemPrompt } from '../data/agentContext'

const initialMessages = (context) => [
  { sender: 'bot', text: AGENT_CONTEXTS[context].greeting },
]

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState('estudio')
  const [messages, setMessages] = useState(() => initialMessages('estudio'))
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messageListRef = useRef(null)
  const inputRef = useRef(null)
  const launcherRef = useRef(null)
  const pendingRef = useRef(false)
  const controllerRef = useRef(null)
  const apiKey = (import.meta.env.VITE_AI_API_KEY || '').trim()

  useEffect(() => {
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isLoading, isOpen])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => () => controllerRef.current?.abort(), [])

  const closeChat = () => {
    setIsOpen(false)
    launcherRef.current?.focus()
  }

  const resetChat = (nextContext) => {
    if (pendingRef.current) return
    setContext(nextContext)
    setMessages(initialMessages(nextContext))
    setInput('')
    inputRef.current?.focus()
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || pendingRef.current) return

    pendingRef.current = true
    setMessages((previous) => [...previous, { sender: 'user', text }])
    setInput('')
    setIsLoading(true)
    const controller = new AbortController()
    controllerRef.current = controller
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      if (!apiKey) {
        throw new Error('Falta configurar VITE_AI_API_KEY en el archivo .env. Añade tu clave de Cohere y reinicia el servidor de desarrollo.')
      }

      // La sesión 29 usa fetch, POST, message y preamble de Cohere Chat v1.
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_AI_MODEL || 'command-a-03-2025',
          message: text,
          preamble: buildSystemPrompt(context),
        }),
        signal: controller.signal,
      })

      if (response.status === 401 || response.status === 403) {
        throw new Error('No se pudo autorizar la consulta. Revisa tu clave de Cohere y los permisos de tu cuenta.')
      }
      if (response.status === 429) {
        throw new Error('Se alcanzó el límite de consultas de la API. Espera un momento e inténtalo de nuevo.')
      }
      if (response.status === 400 || response.status === 404) {
        throw new Error('La API no aceptó la consulta. Revisa que VITE_AI_MODEL sea un modelo disponible para tu cuenta de Cohere.')
      }
      if (!response.ok) throw new Error('El servicio de IA no está disponible en este momento. Inténtalo de nuevo más tarde.')

      const data = await response.json()
      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new Error('No recibí una respuesta válida. Intenta enviar de nuevo tu consulta.')
      }
      setMessages((previous) => [...previous, { sender: 'bot', text: data.text }])
    } catch (error) {
      const errorText = error.name === 'AbortError'
        ? 'La consulta tardó demasiado. Inténtalo de nuevo.'
        : error instanceof TypeError || error instanceof SyntaxError
          ? 'No se pudo completar la consulta. Comprueba tu conexión e inténtalo de nuevo.'
          : error.message
      setMessages((previous) => [...previous, { sender: 'bot', text: errorText, error: true }])
    } finally {
      clearTimeout(timeout)
      controllerRef.current = null
      pendingRef.current = false
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <button
        ref={launcherRef}
        className="chat-launcher"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={isOpen}
        aria-controls="chat-window"
      >
        <MessageSquare size={22} aria-hidden="true" />
        <span>¿Te ayudamos?</span>
      </button>

      {isOpen && (
        <section
          id="chat-window"
          className="chat-window"
          aria-label="Asistente de ventas"
          onKeyDown={(event) => { if (event.key === 'Escape') closeChat() }}
        >
          <header className="chat-header">
            <span className="bot-avatar"><Bot size={23} aria-hidden="true" /></span>
            <div><h2>Asistente de ventas</h2><p>TechStore · Cohere AI</p></div>
            <button className="icon-button" onClick={closeChat} aria-label="Cerrar ventana de chat"><X size={20} /></button>
          </header>

          <div className="context-controls">
            <label htmlFor="agent-context">Contexto del agente</label>
            <div className="context-row">
              <select id="agent-context" value={context} onChange={(event) => resetChat(event.target.value)} disabled={isLoading}>
                {Object.entries(AGENT_CONTEXTS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
              </select>
              <button className="reset-button" onClick={() => resetChat(context)} disabled={isLoading} aria-label="Reiniciar conversación" title="Reiniciar conversación"><RotateCcw size={17} /></button>
            </div>
            <small>Cambiar el contexto inicia una conversación nueva.</small>
          </div>

          {!apiKey && <p className="configuration-note">Configura tu clave de Cohere en <code>.env</code> para recibir respuestas de IA.</p>}

          <div ref={messageListRef} className="message-list" role="log" aria-label="Mensajes del chat" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`message message-${message.sender}${message.error ? ' message-error' : ''}`}>
                <span className="message-author">{message.sender === 'user' ? 'Tú' : message.error ? 'Aviso' : 'TechStore'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading && <p className="loading" role="status">Procesando<span>…</span></p>}
          </div>

          <form className="chat-form" onSubmit={handleSend}>
            <label className="sr-only" htmlFor="chat-input">Escribe tu consulta</label>
            <input ref={inputRef} id="chat-input" placeholder="Escribe tu consulta..." value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} autoComplete="off" />
            <button type="submit" className="send-button" disabled={isLoading || !input.trim()} aria-label="Enviar mensaje"><Send size={19} aria-hidden="true" /></button>
          </form>
          <p className="chat-footnote">Consulta precios y características de nuestro catálogo.</p>
        </section>
      )}
    </div>
  )
}
