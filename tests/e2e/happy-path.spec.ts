import { expect, test } from '@playwright/test'
import path from 'node:path'
import { mockNetwork, signIn } from './helpers'

const PHOTO = path.resolve('public/icons/icon-512.png')

test('sign in, capture, find by search, make a list, open the public link logged out', async ({ page, browser, baseURL }) => {
  await mockNetwork(page.context())
  await signIn(page)

  // Capture: photo -> nearby place -> thumbs up -> dish -> save
  const started = Date.now()
  await page.getByRole('link', { name: 'Add a spot' }).click()
  await page.getByTestId('photo-gallery').setInputFiles(PHOTO)
  await page.getByRole('button', { name: /La Pecora Bianca/ }).click()
  await page.getByRole('button', { name: 'Loved it' }).click()
  await page.getByLabel(/What did you have/).fill('Cacio e pepe')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved ✓')).toBeVisible()
  expect(Date.now() - started).toBeLessThan(10_000)
  await page.getByRole('button', { name: 'date night' }).click()
  await page.getByRole('link', { name: 'Done' }).click()

  // Recall: forgiving search by a misspelled dish
  await page.getByRole('link', { name: 'My spots' }).click()
  await page.getByRole('searchbox', { name: 'Search your spots' }).fill('casio')
  await expect(page.getByRole('link', { name: /La Pecora Bianca/ })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search your spots' }).fill('zzzzzz')
  await expect(page.getByText('No matches')).toBeVisible()

  // Lists: create, add the place, share
  await page.getByRole('link', { name: 'Lists' }).click()
  await page.getByRole('button', { name: 'New list' }).click()
  await page.getByLabel('Title').fill("John's Top 10 for Visitors")
  await page.getByLabel('A short note').fill('Where I take everyone.')
  await page.getByRole('checkbox', { name: /La Pecora Bianca/ }).check()
  await page.getByRole('checkbox', { name: /Anyone with the link can view/ }).check()
  await page.getByRole('button', { name: 'Share this list' }).click()
  const preview = page.getByRole('link', { name: 'Preview it' })
  await expect(preview).toBeVisible()
  const href = await preview.getAttribute('href')
  expect(href).toMatch(/^\/l\/[A-Za-z0-9]{10}#/)

  // A friend opens the link: brand new browser context, no login, no stored data.
  const friend = await browser.newContext({ baseURL })
  const fp = await friend.newPage()
  await fp.goto(href!)
  await expect(fp.getByRole('heading', { name: "John's Top 10 for Visitors" })).toBeVisible()
  await expect(fp.getByText('Where I take everyone.')).toBeVisible()
  await expect(fp.getByRole('heading', { name: 'La Pecora Bianca' })).toBeVisible()
  await expect(fp.getByText('Cacio e pepe')).toBeVisible()
  await expect(fp.getByRole('link', { name: 'Open in maps' })).toHaveAttribute('href', /google\.com\/maps/)
  const body = await fp.locator('body').innerText()
  expect(body).not.toMatch(/john@example\.com|2026|20\d\d-\d\d-\d\d/)
  await friend.close()
})

test('capture works offline by typing the restaurant name', async ({ page, context }) => {
  await mockNetwork(context)
  await signIn(page)
  // Later routes win: make place lookups fail like a dropped connection.
  await context.route(/overpass-api\.de|nominatim\.openstreetmap\.org/, (r) => r.abort('internetdisconnected'))
  await context.setOffline(true)
  await page.getByRole('link', { name: 'Add a spot' }).click()
  await page.getByRole('button', { name: 'Skip the photo' }).click()
  await page.getByLabel('Restaurant name').fill('Corner Bistro')
  await page.getByRole('button', { name: /Use “Corner Bistro”/ }).click()
  await page.getByRole('button', { name: 'Not for me' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved ✓')).toBeVisible()
})

test('map shows saved places', async ({ page, context }) => {
  await mockNetwork(context)
  await signIn(page)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Add sample spots' }).click()
  await expect(page.getByText('Added 25 sample spots.')).toBeVisible()
  await page.getByRole('link', { name: 'Map' }).click()
  const pin = page.getByRole('button', { name: /Lilia, loved it/ })
  await expect(pin).toBeVisible({ timeout: 15_000 })
  // Pins overlap at city-wide zoom, so click the element directly instead of by position.
  await pin.evaluate((el) => (el as HTMLElement).click())
  await expect(page.getByText('Mafaldine with pink peppercorn')).toBeVisible()
  await page.screenshot({ path: 'test-results/map.png' })
})
