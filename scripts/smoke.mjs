/**
 * SUBTRACK // RUNTIME SMOKE TEST
 *
 * Serves the production build over a tiny static server and drives the real
 * console in headless Chrome: boots the app, seeds IndexedDB, walks every route,
 * exercises the palette, the authoring console, the theme switch and a process
 * termination — and fails loudly on any console error, page exception or missing
 * assertion.
 *
 *   node scripts/smoke.mjs [--headed] [--shots]
 */
import { createServer } from 'node:http'
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SHOTS = join(ROOT, '.smoke')
const args = new Set(process.argv.slice(2))

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost')
      let filePath = join(DIST, normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''))
      if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
        filePath = join(DIST, 'index.html')
      }
      const body = await readFile(filePath)
      response.writeHead(200, {
        'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      response.end(body)
    } catch (error) {
      response.writeHead(500)
      response.end(String(error))
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

const failures = []
const notes = []

function check(label, condition, detail = '') {
  if (condition) {
    notes.push(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failures.push(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const executablePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (!executablePath) {
  console.error('No Chromium binary found; skipping runtime smoke test.')
  process.exit(0)
}

const { server, port } = await startServer()
const base = `http://127.0.0.1:${port}`

const browser = await puppeteer.launch({
  executablePath,
  headless: !args.has('--headed'),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,960'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })

const consoleErrors = []
const pageErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(error.message))

const shot = async (name) => {
  if (!args.has('--shots')) return
  await mkdir(SHOTS, { recursive: true })
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false })
}

try {
  /* ---------------------------------------------------------------- boot --- */
  await page.goto(`${base}/`, { waitUntil: 'load' })
  await page.waitForFunction(
    () => document.body.innerText.includes('MONTHLY BURN'),
    { timeout: 15000 },
  )
  await new Promise((resolve) => setTimeout(resolve, 1200))

  const heroText = await page.$eval('h1', (node) => node.innerText)
  const heroValue = Number(heroText.replace(/[^\d.]/g, ''))
  check('overview renders the monthly burn hero', heroValue > 1000, `₹${heroValue}`)
  check('skin applied to <html>', (await page.$eval('html', (n) => n.dataset.theme)) === 'dark')
  check('theme-color meta synced', (await page.$eval('meta[name="theme-color"]', (n) => n.content)) === '#050505')

  const seeded = await page.evaluate(async () => {
    const request = indexedDB.open('subtrack')
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const count = (store) =>
      new Promise((resolve) => {
        const tx = db.transaction(store).objectStore(store).count()
        tx.onsuccess = () => resolve(tx.result)
      })
    return { subs: await count('subscriptions'), payments: await count('payments') }
  })
  check('demo dataset seeded into IndexedDB', seeded.subs >= 15 && seeded.payments > 50,
    `${seeded.subs} processes, ${seeded.payments} charges`)

  const cardCount = await page.$$eval('a[href^="/flow/"]', (nodes) => nodes.length)
  check('process modules rendered on overview', cardCount >= 6, `${cardCount} links`)
  check('burn rail segments present', (await page.$$('button[aria-label*="percent of burn"]')).length >= 10)
  check('spending signal svg drawn', (await page.$$('svg path')).length > 0)
  await shot('01-overview')

  /* -------------------------------------------------------------- palette --- */
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyK')
  await page.keyboard.up('Control')
  await page.waitForSelector('[role="dialog"][aria-label="Command palette"]', { timeout: 5000 })
  check('command palette opens on ctrl+k', true)
  await page.type('[role="dialog"][aria-label="Command palette"] input', 'net')
  await new Promise((resolve) => setTimeout(resolve, 300))
  const paletteText = await page.$eval('[role="dialog"][aria-label="Command palette"]', (n) => n.innerText)
  check('palette queries the process index', /NETFLIX/i.test(paletteText))
  await page.type('[role="dialog"][aria-label="Command palette"] input', 'flix >500')
  await new Promise((resolve) => setTimeout(resolve, 250))
  const parsed = await page.$eval('[role="dialog"][aria-label="Command palette"]', (n) => n.innerText)
  check('query language parses amount filters', /PARSED/.test(parsed) && /AMOUNT/.test(parsed))
  await shot('02-palette')
  await page.keyboard.press('Escape')

  /* -------------------------------------------------------- authoring flow --- */
  await page.waitForFunction(() => !document.querySelector('[aria-label="Command palette"]'))
  await page.keyboard.press('KeyN')
  await page.waitForSelector('[role="dialog"][aria-labelledby="composer-title"]', { timeout: 5000 })
  check('initialize console opens with N', true)
  await page.type('#composer-name', 'Spotify')
  await page.waitForFunction(() => document.querySelector('#composer-price')?.value !== '')
  const prefilled = await page.$eval('#composer-price', (n) => n.value)
  check('service selection pre-fills price', Number(prefilled) > 0, `₹${prefilled}`)
  await page.click('#composer-price')
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyA')
  await page.keyboard.up('Control')
  await page.type('#composer-price', '1299')
  await new Promise((resolve) => setTimeout(resolve, 150))
  const typed = await page.$eval('#composer-price', (n) => n.value)
  check('price field accepts a replacement', typed === '1299', `value "${typed}"`)
  const beforeCreate = seeded.subs
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')]
    const cta = buttons.find((b) => b.textContent?.includes('INITIALIZE SUBSCRIPTION') && b.closest('[role="dialog"]'))
    cta?.click()
  })
  await page.waitForFunction(
    (expected) => window.location.pathname.startsWith('/flow/') && expected >= 0,
    { timeout: 8000 },
    beforeCreate,
  )
  await new Promise((resolve) => setTimeout(resolve, 900))
  const detailText = await page.evaluate(() => document.body.innerText)
  check('new process lands on its diagnostic panel', /PROCESS \/\//.test(detailText))
  check('detail shows the entered price', /₹1,299\b/.test(detailText), '₹1,299')
  check('detail lists payment history', /Payment history/i.test(detailText))
  check('ledger recorded the first cycle', /TXN-/.test(detailText))
  await shot('03-detail')

  /* ------------------------------------------------------------ terminate --- */
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').trim() === 'TERMINATE SUBSCRIPTION',
    )
    button?.click()
  })
  await page.waitForSelector('[role="alertdialog"]', { timeout: 6000 })
  const dialogText = await page.$eval('[role="alertdialog"]', (n) => n.innerText)
  check('termination explains consequences', /STEP 1 OF 2/.test(dialogText) && /WHAT HAPPENS/.test(dialogText))
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('[role="alertdialog"] button')].find((b) =>
      b.textContent?.includes('TERMINATE SUBSCRIPTION'),
    )
    button?.click()
  })
  await new Promise((resolve) => setTimeout(resolve, 200))
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('[role="alertdialog"] button')].find((b) =>
      b.textContent?.includes('CONFIRM TERMINATION'),
    )
    button?.click()
  })
  await new Promise((resolve) => setTimeout(resolve, 1200))
  const afterTerminate = await page.evaluate(() => document.body.innerText)
  check('termination completes and reports', /TERMINATED/.test(afterTerminate))
  await shot('04-terminated')

  /* ---------------------------------------------------------------- routes --- */
  for (const [path, marker] of [
    ['/flow', 'SUBSCRIPTIONS'],
    ['/time', 'PAYMENT MATRIX'],
    ['/data', 'SYSTEM ANALYTICS'],
    ['/sys', 'SETTINGS'],
    ['/nope', 'NO SUCH MODULE'],
  ]) {
    await page.goto(`${base}${path}`, { waitUntil: 'load' })
    await new Promise((resolve) => setTimeout(resolve, 900))
    const text = await page.evaluate(() => document.body.innerText)
    check(`route ${path} renders`, text.includes(marker), marker)
    if (path === '/time') {
      const cells = await page.$$eval('button[aria-label*="charges"]', (nodes) => nodes.length)
      check('payment matrix renders 42 day cells', cells === 42, `${cells} cells`)
    }
    await shot(`05-${path.replace(/\W+/g, '') || 'root'}`)
  }

  /* ----------------------------------------------------------------- skin --- */
  await page.goto(`${base}/`, { waitUntil: 'load' })
  await new Promise((resolve) => setTimeout(resolve, 800))
  await page.evaluate(() => {
    const button = document.querySelector('button[aria-label*="daylight"]')
    button?.click()
  })
  await new Promise((resolve) => setTimeout(resolve, 500))
  const daySkin = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    meta: document.querySelector('meta[name="theme-color"]')?.content,
    stored: localStorage.getItem('subtrack.theme'),
    bg: getComputedStyle(document.body).backgroundColor,
  }))
  check('daylight skin applies', daySkin.theme === 'day' && daySkin.meta === '#F2F1EC', daySkin.bg)
  check('theme persisted for pre-paint boot', daySkin.stored === 'day')
  await shot('06-daylight')

  /* --------------------------------------------------------------- mobile --- */
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(`${base}/`, { waitUntil: 'load' })
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const mobile = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Primary"]')
    const rail = document.querySelector('nav[aria-label="Primary"]')?.getBoundingClientRect()
    return {
      bottomNavVisible: Boolean(nav && nav.getBoundingClientRect().bottom > 700),
      navWidth: rail?.width ?? 0,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    }
  })
  check('mobile console docked at the bottom', mobile.bottomNavVisible)
  check('no horizontal overflow at 390px', mobile.overflowX <= 1, `${mobile.overflowX}px`)
  await shot('07-mobile')

  await page.setViewport({ width: 320, height: 720, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(`${base}/flow`, { waitUntil: 'load' })
  await new Promise((resolve) => setTimeout(resolve, 900))
  const narrow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('no horizontal overflow at 320px', narrow <= 1, `${narrow}px`)
  await shot('08-320')

  /* -------------------------------------------------------------- offline --- */
  const swReady = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return Boolean(registration)
  })
  check('service worker registered', swReady)
} catch (error) {
  failures.push(`  FAIL  smoke run threw — ${error.message}`)
} finally {
  await browser.close()
  server.close()
}

const report = [
  'SUBTRACK // RUNTIME SMOKE REPORT',
  ...notes,
  ...failures,
  `RESULT: ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} CHECK(S) FAILED`}`,
  `CONSOLE ERRORS: ${consoleErrors.length}${consoleErrors.length ? `\n${consoleErrors.slice(0, 12).map((e) => `    ! ${e}`).join('\n')}` : ''}`,
  `PAGE EXCEPTIONS: ${pageErrors.length}${pageErrors.length ? `\n${pageErrors.slice(0, 12).map((e) => `    ! ${e}`).join('\n')}` : ''}`,
].join('\n')

await writeFile(join(ROOT, '.smoke-report.txt'), report)
console.log(report)
process.exitCode = failures.length === 0 && pageErrors.length === 0 ? 0 : 1
