import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3001",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    headless: true,
  },
  webServer: {
    command: "npm run start -- --port 3001",
    url: "http://127.0.0.1:3001/mineracao",
    reuseExistingServer: false,
    env: { SUPABASE_URL: "", SUPABASE_ANON_KEY: "", ADMIN_USER_ID: "" },
  },
  reporter: "list",
});
