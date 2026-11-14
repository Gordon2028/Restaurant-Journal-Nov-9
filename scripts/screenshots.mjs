// Regenerates the README screenshots in docs/screenshots.
//
//   VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npm run dev -- --port 5175
//   node scripts/screenshots.mjs http://localhost:5175
//
// Run it against a server with the Supabase variables blank: the app then runs in local-only mode,
// loads its made-up sample spots, and never touches a real account or backend.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = process.argv[2] ?? 'http://localhost:5175'
const out = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light', // no geolocation permission: capture falls back to typing the name
})
const page = await context.newPage()
const shot = async (name) => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}${name}.png` })
  console.log('saved', name)
}

// Sign in (local-only mode), then load the sample spots.
await page.goto(base)
await page.getByLabel('Your email').fill('john@example.com')
await page.getByRole('button', { name: 'Get started' }).click()
await page.getByRole('heading', { name: 'What did you just eat?' }).waitFor()
await page.getByRole('link', { name: 'Settings' }).click()
await page.getByRole('button', { name: 'Add sample spots' }).click()
await page.getByText('Added 25 sample spots.').waitFor()

// 1. Home
await page.getByRole('link', { name: 'Home', exact: true }).click()
await page.getByRole('heading', { name: 'What did you just eat?' }).waitFor()
await shot('01-home')

// 2. Capture: rate the dish (type the name so no network lookup is needed)
await page.getByRole('link', { name: 'Add a spot' }).click()
await page.getByRole('button', { name: 'Skip the photo' }).click()
await page.getByRole('button', { name: 'Search by name instead' }).click()
await page.getByLabel('Restaurant name').fill('Lilia')
await page.getByRole('button', { name: /Use “Lilia”/ }).click()
await page.getByRole('button', { name: 'Loved it' }).click()
await page.getByLabel(/What did you have/).fill('Mafaldine with pink peppercorn')
await shot('02-capture')
await page.getByRole('link', { name: 'Close' }).click()

// 3. My spots, searched
await page.getByRole('link', { name: 'My spots' }).click()
await page.getByRole('searchbox', { name: 'Search your spots' }).fill('pizza')
await page.waitForTimeout(500)
await shot('03-my-spots')
await page.getByRole('searchbox', { name: 'Search your spots' }).fill('')

// 4. A spot
await page.getByRole('link', { name: /Katz's Delicatessen/ }).first().click()
await page.getByRole('heading', { name: /Katz's Delicatessen/ }).waitFor()
await shot('04-spot')

// 5. Map
await page.getByRole('link', { name: 'Map', exact: true }).click()
await page.locator('canvas').first().waitFor()
await page.waitForTimeout(5000) // let map tiles load
await shot('05-map')

// 6. Best bites
await page.getByRole('link', { name: 'Best bites' }).click()
await page.getByRole('heading', { name: /Best things/ }).waitFor()
await page.waitForTimeout(800)
await shot('06-best-bites')

// 7. A shared list, as a friend sees it
await page.getByRole('link', { name: 'Lists', exact: true }).click()
await page.getByRole('button', { name: 'New list' }).click()
await page.getByLabel('Title').fill('Where I take visitors')
await page.getByLabel('A short note').fill('Five spots that never miss.')
for (const name of [/Lilia/, /Katz's Delicatessen/, /Joe's Pizza/, /Superiority Burger/, /Via Carota/]) {
  await page.getByRole('checkbox', { name }).first().check()
}
await page.getByRole('checkbox', { name: /Anyone with the link can view/ }).check()
await page.getByRole('button', { name: 'Share this list' }).click()
await page.getByRole('link', { name: 'Preview it' }).click()
await page.getByRole('heading', { name: 'Where I take visitors' }).waitFor()
await shot('07-shared-list')

await browser.close()
