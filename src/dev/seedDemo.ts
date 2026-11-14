import type { Rating } from '../domain/types'
import { placeRepo, visitRepo, eventRepo } from '../services/data/localRepos'

interface Demo {
  name: string; hood: string; cuisine: string; lat: number; lng: number
  dish: string; rating: Rating; tags: string[]
}

/** Coordinates are approximate; this is demo data, not a directory. */
export const DEMO: Demo[] = [
  { name: 'Lilia', hood: 'Williamsburg', cuisine: 'italian', lat: 40.7219, lng: -73.9625, dish: 'Mafaldine with pink peppercorn', rating: 'up', tags: ['date night', 'impressive for visitors'] },
  { name: "Katz's Delicatessen", hood: 'Lower East Side', cuisine: 'deli', lat: 40.7223, lng: -73.9874, dish: 'Pastrami on rye', rating: 'up', tags: ['impressive for visitors', 'quick bite'] },
  { name: "Joe's Pizza", hood: 'Greenwich Village', cuisine: 'pizza', lat: 40.7306, lng: -74.0021, dish: 'Plain slice', rating: 'up', tags: ['cheap eats', 'quick bite'] },
  { name: 'Superiority Burger', hood: 'East Village', cuisine: 'vegetarian', lat: 40.7272, lng: -73.984, dish: 'Superiority burger', rating: 'up', tags: ['cheap eats', 'quick bite'] },
  { name: 'Via Carota', hood: 'West Village', cuisine: 'italian', lat: 40.7312, lng: -74.0034, dish: 'Insalata verde', rating: 'up', tags: ['date night', 'see-and-be-seen'] },
  { name: 'Russ & Daughters Cafe', hood: 'Lower East Side', cuisine: 'jewish', lat: 40.722, lng: -73.9884, dish: 'Classic board with lox', rating: 'up', tags: ['brunch'] },
  { name: 'Di Fara Pizza', hood: 'Midwood', cuisine: 'pizza', lat: 40.625, lng: -73.9615, dish: 'Square slice', rating: 'up', tags: ['cheap eats'] },
  { name: 'Peter Luger Steak House', hood: 'Williamsburg', cuisine: 'steakhouse', lat: 40.7099, lng: -73.9625, dish: 'Porterhouse for two', rating: 'down', tags: ['big group'] },
  { name: "Xi'an Famous Foods", hood: 'Chinatown', cuisine: 'chinese', lat: 40.7157, lng: -73.9969, dish: 'Spicy cumin lamb noodles', rating: 'up', tags: ['cheap eats', 'quick bite'] },
  { name: 'Wo Hop', hood: 'Chinatown', cuisine: 'chinese', lat: 40.7142, lng: -73.9984, dish: 'Egg foo young', rating: 'up', tags: ['cheap eats', 'big group'] },
  { name: 'Balthazar', hood: 'SoHo', cuisine: 'french', lat: 40.7226, lng: -73.9985, dish: 'Steak frites', rating: 'up', tags: ['brunch', 'see-and-be-seen', 'impressive for visitors'] },
  { name: 'Le Bernardin', hood: 'Midtown', cuisine: 'seafood', lat: 40.7616, lng: -73.9818, dish: 'Chef tasting menu', rating: 'up', tags: ['date night', 'impressive for visitors'] },
  { name: 'Gramercy Tavern', hood: 'Gramercy', cuisine: 'american', lat: 40.7385, lng: -73.9885, dish: 'Tavern burger', rating: 'up', tags: ['date night'] },
  { name: "Roberta's", hood: 'Bushwick', cuisine: 'pizza', lat: 40.705, lng: -73.9334, dish: 'Bee Sting pizza', rating: 'up', tags: ['big group', 'cocktails'] },
  { name: 'The Dead Rabbit', hood: 'Financial District', cuisine: 'irish', lat: 40.7035, lng: -74.0111, dish: 'Irish coffee', rating: 'up', tags: ['cocktails'] },
  { name: 'Attaboy', hood: 'Lower East Side', cuisine: 'cocktail bar', lat: 40.7191, lng: -73.9894, dish: "Bartender's choice", rating: 'up', tags: ['cocktails', 'date night'] },
  { name: 'Sunday in Brooklyn', hood: 'Williamsburg', cuisine: 'american', lat: 40.7141, lng: -73.9618, dish: 'Malted pancakes', rating: 'up', tags: ['brunch'] },
  { name: 'Tacombi', hood: 'Nolita', cuisine: 'mexican', lat: 40.7225, lng: -73.9955, dish: 'Al pastor tacos', rating: 'up', tags: ['quick bite', 'big group'] },
  { name: "Joe's Shanghai", hood: 'Chinatown', cuisine: 'chinese', lat: 40.7144, lng: -73.9976, dish: 'Soup dumplings', rating: 'up', tags: ['big group', 'cheap eats'] },
  { name: 'Thursday Kitchen', hood: 'East Village', cuisine: 'korean', lat: 40.727, lng: -73.9838, dish: 'Bulgogi bowl', rating: 'down', tags: [] },
  { name: 'Los Tacos No.1', hood: 'Chelsea', cuisine: 'mexican', lat: 40.7424, lng: -74.0061, dish: 'Adobada taco', rating: 'up', tags: ['quick bite', 'cheap eats'] },
  { name: 'Carbone', hood: 'Greenwich Village', cuisine: 'italian', lat: 40.728, lng: -74.0001, dish: 'Spicy rigatoni vodka', rating: 'up', tags: ['date night', 'see-and-be-seen', 'impressive for visitors'] },
  { name: 'Prince Street Pizza', hood: 'Nolita', cuisine: 'pizza', lat: 40.723, lng: -73.9944, dish: 'SoHo square slice', rating: 'up', tags: ['cheap eats', 'quick bite'] },
  { name: 'Rubirosa', hood: 'Nolita', cuisine: 'italian', lat: 40.7226, lng: -73.9961, dish: 'Tie-dye pizza', rating: 'up', tags: ['big group', 'date night'] },
  { name: 'Veselka', hood: 'East Village', cuisine: 'ukrainian', lat: 40.7292, lng: -73.9873, dish: 'Potato pierogi', rating: 'up', tags: ['cheap eats', 'brunch'] },
]

/** A warm gradient "photo" with the dish name, so demo cards look like real ones. */
function fakePhoto(label: string, i: number): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = 800
  c.height = 600
  const g = c.getContext('2d')!
  const hue = (i * 37) % 360
  const grad = g.createLinearGradient(0, 0, 800, 600)
  grad.addColorStop(0, `hsl(${hue} 70% 62%)`)
  grad.addColorStop(1, `hsl(${(hue + 40) % 360} 65% 38%)`)
  g.fillStyle = grad
  g.fillRect(0, 0, 800, 600)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.beginPath()
  g.arc(400, 300, 190, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = `hsl(${hue} 60% 30%)`
  g.textAlign = 'center'
  // Wrap onto up to 3 lines inside the circle so long dish names stay readable.
  g.font = 'bold 40px Georgia, serif'
  const lines: string[] = []
  let cur = ''
  for (const w of label.split(' ')) {
    if (g.measureText(`${cur} ${w}`.trim()).width > 300 && cur) { lines.push(cur); cur = w } else cur = `${cur} ${w}`.trim()
  }
  lines.push(cur)
  lines.slice(0, 3).forEach((l, k, a) => g.fillText(l, 400, 300 + (k - (a.length - 1) / 2) * 48 + 14))
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.8))
}

/** Adds ~25 demo visits (spread over ~14 weeks) for the signed-in user. Returns how many were added. */
export async function seedDemoData(userId: string): Promise<number> {
  const existing = await visitRepo.listForUser(userId)
  if (existing.some((v) => v.note === 'demo')) return 0
  const now = Date.now()
  let added = 0
  for (const [i, d] of DEMO.entries()) {
    const place = await placeRepo.upsert({
      externalId: `demo:${d.name}`, name: d.name, address: '', neighborhood: d.hood, cuisine: d.cuisine, lat: d.lat, lng: d.lng,
    })
    const id = crypto.randomUUID()
    const at = new Date(now - (i * 4 + 1) * 86_400_000).toISOString()
    await visitRepo.add(
      { id, userId, placeId: place.id, rating: d.rating, dishName: d.dish, photoKey: `${id}.jpg`, note: 'demo',
        tags: d.tags, visitedAt: at, createdAt: at, syncStatus: 'local' },
      await fakePhoto(d.dish, i),
    )
    await eventRepo.add({ id: crypto.randomUUID(), userId, name: 'capture_completed',
      props: { seconds: 6 + ((i * 7) % 9), hasPhoto: true, hasDish: true }, at })
    added++
  }
  return added
}
