import { expect, test } from '@playwright/test'

const api = 'https://api.cohere.ai/v1/chat'

test.beforeEach(async ({ page }) => {
  // Bloqueo por defecto: jamás enviar la clave ficticia al proveedor real.
  await page.route('https://api.cohere.ai/**', (route) => route.abort())
  await page.goto('/')
})

async function evidence(page, name, project) {
  // La etiqueta solo se agrega al navegador de prueba, no al código de la app.
  await page.evaluate(() => {
    const label = document.createElement('div')
    label.textContent = 'EVIDENCIA DE PRUEBA · API SIMULADA'
    label.style.cssText = 'position:fixed;top:0;left:0;z-index:2000;background:#172e24;color:white;padding:4px 10px;font:10px sans-serif;pointer-events:none'
    document.body.append(label)
  })
  await page.screenshot({ path: `docs/evidencias/${name}-${project}.png`, fullPage: true })
}

test('catálogo, carrito y consulta con el contexto original', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let sentPrompt
  await page.route(api, async (route) => {
    const request = route.request()
    expect(request.method()).toBe('POST')
    const body = request.postDataJSON()
    expect(body.message).toBe('¿Cuánto cuesta la laptop?')
    sentPrompt = body.preamble
    await route.fulfill({ json: { text: 'La Laptop Pro 15 cuesta $1200. Tiene 16GB RAM y 512GB SSD.' } })
  })
  await expect(page.getByRole('article')).toHaveCount(4)
  await page.getByRole('button', { name: 'Agregar al carrito: Laptop Pro 15' }).click()
  await expect(page.getByRole('status', { name: 'Carrito: 1 productos' })).toBeAttached()
  await page.getByRole('button', { name: 'Abrir asistente' }).click()
  await page.getByLabel('Contexto del agente').selectOption('original')
  await page.getByRole('textbox').fill('¿Cuánto cuesta la laptop?')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByRole('log')).toContainText('La Laptop Pro 15 cuesta $1200.')
  expect(sentPrompt).toContain('Laptop Pro 15 ($1200)')
  expect(sentPrompt).not.toContain('CONTEXTO MODIFICADO')
  await page.evaluate(() => window.scrollTo(0, 0))
  await evidence(page, '01-contexto-original', testInfo.project.name)
  expect(errors).toEqual([])
})

test('cambio de contexto y recomendación por presupuesto', async ({ page }, testInfo) => {
  let sentPrompt
  await page.route(api, async (route) => {
    sentPrompt = route.request().postDataJSON().preamble
    await route.fulfill({ json: { text: 'Te recomiendo el Teclado Mecánico RGB por $80. Tiene switches red e iluminación personalizable. Se ajusta a tu presupuesto de $100; te quedarían $20.' } })
  })
  await page.getByRole('button', { name: 'Abrir asistente' }).click()
  await page.getByLabel('Contexto del agente').selectOption('original')
  await page.getByLabel('Contexto del agente').selectOption('estudio')
  await expect(page.getByRole('log')).toContainText('asesor de estudio')
  await page.getByRole('textbox').fill('Tengo $100 y necesito un teclado para estudiar. ¿Qué recomiendas?')
  await page.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(page.getByRole('log')).toContainText('Te recomiendo el Teclado Mecánico RGB por $80.')
  expect(sentPrompt).toContain('CONTEXTO MODIFICADO — ASESOR DE ESTUDIO')
  expect(sentPrompt).toContain('sin superar el presupuesto')
  await evidence(page, '02-contexto-modificado', testInfo.project.name)
  await page.getByRole('button', { name: 'Cerrar ventana de chat' }).click()
  await page.getByRole('button', { name: 'Agregar al carrito: Teclado Mecánico RGB' }).click()
  await expect(page.getByRole('status', { name: 'Carrito: 1 productos' })).toBeAttached()
})

test('error de cuota, recuperación y reinicio del chat', async ({ page }) => {
  let calls = 0
  await page.route(api, (route) => {
    calls += 1
    return calls === 1
      ? route.fulfill({ status: 429, json: {} })
      : route.fulfill({ json: { text: 'El monitor cuesta $400.' } })
  })
  await page.getByRole('button', { name: 'Abrir asistente' }).click()
  await page.getByRole('textbox').fill('¿Precio del monitor?')
  await page.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(page.getByRole('log')).toContainText('Se alcanzó el límite de consultas')
  await page.getByRole('textbox').fill('¿Precio del monitor?')
  await page.getByRole('textbox').press('Enter')
  await expect(page.getByRole('log')).toContainText('El monitor cuesta $400.')
  await page.getByRole('button', { name: 'Reiniciar conversación' }).click()
  await expect(page.getByRole('log')).not.toContainText('El monitor cuesta $400.')
  await expect(page.getByRole('log')).toContainText('asesor de estudio')
})

test('interfaz adaptable y ventana de chat dentro de la pantalla', async ({ page }, testInfo) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await evidence(page, '03-catalogo', testInfo.project.name)
  await page.getByRole('button', { name: 'Abrir asistente' }).click()
  const window = await page.getByRole('region', { name: 'Asistente de ventas' }).boundingBox()
  const viewport = page.viewportSize()
  expect(window.x).toBeGreaterThanOrEqual(0)
  expect(window.y).toBeGreaterThanOrEqual(0)
  expect(window.x + window.width).toBeLessThanOrEqual(viewport.width)
  expect(window.y + window.height).toBeLessThanOrEqual(viewport.height)
  await expect(page.getByRole('textbox')).toBeFocused()
  await page.getByRole('textbox').press('Escape')
  await expect(page.getByRole('button', { name: 'Abrir asistente' })).toBeFocused()
})
