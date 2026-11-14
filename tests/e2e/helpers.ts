import type { BrowserContext, Page } from '@playwright/test'

const NYC = { latitude: 40.7233, longitude: -73.9965 }

const overpass = {
  elements: [
    { type: 'node', id: 1, lat: 40.7235, lon: -73.9963, tags: { name: 'La Pecora Bianca', amenity: 'restaurant', cuisine: 'italian', 'addr:suburb': 'Little Italy' } },
    { type: 'node', id: 2, lat: 40.7238, lon: -73.9968, tags: { name: "Lucky's", amenity: 'cafe' } },
    { type: 'node', id: 3, lat: 40.7241, lon: -73.9971, tags: { name: 'Cafe Select', amenity: 'cafe' } },
  ],
}

/** Make places lookups and map tiles deterministic and offline-safe. */
export async function mockNetwork(context: BrowserContext) {
  await context.route('https://overpass-api.de/**', (r) => r.fulfill({ json: overpass }))
  await context.route('https://nominatim.openstreetmap.org/reverse**', (r) => r.fulfill({ json: { address: { neighbourhood: 'Little Italy' } } }))
  await context.route('https://nominatim.openstreetmap.org/search**', (r) => r.fulfill({ json: [] }))
  await context.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ status: 204 }))
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '', contentType: 'text/css' }))
  await context.grantPermissions(['geolocation', 'clipboard-read', 'clipboard-write'])
  await context.setGeolocation(NYC)
}

export async function signIn(page: Page, email = 'john@example.com') {
  await page.goto('/')
  await page.getByLabel('Your email').fill(email)
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('heading', { name: 'What did you just eat?' }).waitFor()
}
