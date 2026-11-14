import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', ...devices['Pixel 7'] },
  // Test the production build, as users get it, in local-only mode: blank Supabase values override .env.local,
  // so tests never touch the real backend or send email.
  webServer: {
    command: 'VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
