import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

async function openChat() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))
  return user
}

async function sendMessage(user, text) {
  await user.type(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), text)
  await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
}

describe('Tienda y agente conversacional — sesión 29', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_API_KEY', 'clave-ficticia-unitaria')
    vi.stubEnv('VITE_AI_MODEL', 'command-a-03-2025')
    // Ninguna prueba automática consume la API real ni utiliza credenciales reales.
    vi.stubGlobal('fetch', vi.fn())
  })

  it('muestra los cuatro productos del Word con sus precios', () => {
    render(<App />)
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(4)
    const expected = [
      ['Laptop Pro 15', '$1200'],
      ['Auriculares Inalámbricos', '$150'],
      ['Teclado Mecánico RGB', '$80'],
      ['Monitor 4K 27 pulgadas', '$400'],
    ]
    expected.forEach(([name, price], index) => {
      expect(within(cards[index]).getByRole('heading', { name })).toBeVisible()
      expect(within(cards[index]).getByText(price, { exact: false })).toBeVisible()
    })
  })

  it('filtra el catálogo por categoría y vuelve a mostrar todos los productos', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Periféricos' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Teclado Mecánico RGB' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Periféricos' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Todas' }))
    expect(screen.getAllByRole('article')).toHaveLength(4)
  })

  it('incrementa el carrito al agregar productos, incluso repetidos', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('status', { name: 'Carrito: 0 productos' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Agregar al carrito: Laptop Pro 15' }))
    await user.click(screen.getByRole('button', { name: 'Agregar al carrito: Laptop Pro 15' }))
    await user.click(screen.getByRole('button', { name: 'Agregar al carrito: Teclado Mecánico RGB' }))
    expect(screen.getByRole('status', { name: 'Carrito: 3 productos' })).toBeVisible()
  })

  it('envía el contexto original y el catálogo por POST y muestra la respuesta', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ text: 'La Laptop Pro 15 cuesta $1200.' }) })
    const user = await openChat()
    await user.selectOptions(screen.getByLabelText('Contexto del agente'), 'original')
    await sendMessage(user, '¿Cuánto cuesta la laptop?')
    expect(await screen.findByText('La Laptop Pro 15 cuesta $1200.')).toBeVisible()
    expect(screen.getByText('¿Cuánto cuesta la laptop?')).toBeVisible()
    const [url, request] = fetch.mock.calls[0]
    expect(url).toBe('https://api.cohere.ai/v1/chat')
    expect(request.method).toBe('POST')
    expect(request.headers.Authorization).toBe('Bearer clave-ficticia-unitaria')
    const body = JSON.parse(request.body)
    expect(body.message).toBe('¿Cuánto cuesta la laptop?')
    expect(body.preamble).toContain('Laptop Pro 15 ($1200)')
    expect(body.preamble).toContain('Auriculares Inalámbricos ($150)')
    expect(body.preamble).toContain('Teclado Mecánico RGB ($80)')
    expect(body.preamble).toContain('Monitor 4K 27 pulgadas ($400)')
    expect(body.preamble).toContain('no está disponible')
    expect(body.preamble).not.toContain('CONTEXTO MODIFICADO')
  })

  it('envía el contexto modificado con restricciones de presupuesto', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ text: 'El Teclado Mecánico RGB cuesta $80 y entra en tu presupuesto de $100.' }) })
    const user = await openChat()
    await sendMessage(user, 'Tengo $100 para un teclado para estudiar.')
    expect(await screen.findByText('El Teclado Mecánico RGB cuesta $80 y entra en tu presupuesto de $100.')).toBeVisible()
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.preamble).toContain('CONTEXTO MODIFICADO — ASESOR DE ESTUDIO')
    expect(body.preamble).toContain('sin superar el presupuesto')
    expect(body.preamble).toContain('No inventes descuentos')
  })

  it('reinicia los mensajes al cambiar el contexto', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ text: 'Respuesta de prueba.' }) })
    const user = await openChat()
    await sendMessage(user, 'Primera consulta')
    await screen.findByText('Respuesta de prueba.')
    await user.selectOptions(screen.getByLabelText('Contexto del agente'), 'original')
    expect(screen.queryByText('Primera consulta')).not.toBeInTheDocument()
    expect(screen.queryByText('Respuesta de prueba.')).not.toBeInTheDocument()
    expect(screen.getByText('¡Hola! Soy tu asistente de ventas. ¿En qué te puedo ayudar hoy?')).toBeVisible()
  })

  it('bloquea mensajes vacíos y envíos duplicados durante la espera', async () => {
    let finishRequest
    fetch.mockImplementation(() => new Promise((resolve) => { finishRequest = resolve }))
    const user = await openChat()
    const send = screen.getByRole('button', { name: 'Enviar mensaje' })
    expect(send).toBeDisabled()
    await user.type(screen.getByRole('textbox'), '   ')
    expect(send).toBeDisabled()
    await sendMessage(user, 'Hola')
    expect(screen.getByText('Procesando', { exact: false })).toBeVisible()
    expect(send).toBeDisabled()
    expect(screen.getByLabelText('Contexto del agente')).toBeDisabled()
    await user.type(screen.getByRole('textbox'), 'Otra consulta{Enter}')
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => finishRequest({ ok: true, json: async () => ({ text: 'Hola, ¿en qué te ayudo?' }) }))
    expect(await screen.findByText('Hola, ¿en qué te ayudo?')).toBeVisible()
    expect(send).toBeEnabled()
  })

  it('avisa si falta la API Key sin realizar ninguna petición', async () => {
    vi.stubEnv('VITE_AI_API_KEY', '')
    const user = await openChat()
    await sendMessage(user, 'Hola')
    expect(await screen.findByText(/Falta configurar VITE_AI_API_KEY/)).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    [401, /No se pudo autorizar/],
    [403, /No se pudo autorizar/],
    [429, /Se alcanzó el límite/],
    [400, /VITE_AI_MODEL/],
    [500, /El servicio de IA no está disponible/],
  ])('muestra un aviso amigable ante el error HTTP %s', async (status, message) => {
    fetch.mockResolvedValue({ ok: false, status })
    const user = await openChat()
    await sendMessage(user, 'Hola')
    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.queryByText('Procesando', { exact: false })).not.toBeInTheDocument()
  })

  it('permite volver a consultar después de un error de red', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Conexión recuperada.' }) })
    const user = await openChat()
    await sendMessage(user, 'Primera consulta')
    expect(await screen.findByText(/Comprueba tu conexión/)).toBeVisible()
    await sendMessage(user, 'Segundo intento')
    expect(await screen.findByText('Conexión recuperada.')).toBeVisible()
  })

  it('rechaza respuestas vacías de la API', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ text: '  ' }) })
    const user = await openChat()
    await sendMessage(user, 'Hola')
    expect(await screen.findByText(/No recibí una respuesta válida/)).toBeVisible()
  })

  it('interrumpe las consultas que superan 30 segundos y permite reintentar', async () => {
    vi.useFakeTimers()
    fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Tiempo agotado', 'AbortError')))
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hola' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar mensaje' }).closest('form'))
    await act(async () => vi.advanceTimersByTimeAsync(30000))
    expect(screen.getByText('La consulta tardó demasiado. Inténtalo de nuevo.')).toBeVisible()
    expect(screen.getByLabelText('Contexto del agente')).toBeEnabled()
  })

  it('cierra con Escape, recupera el foco y conserva el chat al reabrir', async () => {
    const user = await openChat()
    await user.type(screen.getByRole('textbox'), 'Consulta sin enviar')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Asistente de ventas' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir asistente' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Abrir asistente' }))
    expect(screen.getByRole('textbox')).toHaveValue('Consulta sin enviar')
  })
})
