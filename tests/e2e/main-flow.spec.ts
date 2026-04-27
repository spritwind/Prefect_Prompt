import { expect, test } from "@playwright/test";

// Prerequisite: log in once via browser, then export the supabase auth cookie.
// Save to E2E_AUTH_COOKIE env var before running:
//   E2E_AUTH_COOKIE='sb-...=...' pnpm test:e2e
// In CI we'd seed via service-role; for MVP local + manual is fine.

test.beforeEach(async ({ context }) => {
  const cookie = process.env.E2E_AUTH_COOKIE;
  if (!cookie) test.skip(true, "E2E_AUTH_COOKIE not set");
  const [name, value] = cookie!.split("=");
  await context.addCookies([{ name, value, url: "http://localhost:3000" }]);
});

test("home → prompt detail → fill → copy", async ({ page }) => {
  await page.goto("/prompts/factor-research/brainstorm/factor-brainstorm-parallel");
  await expect(page.getByText("因子發想-多Agent平行Prompt")).toBeVisible();

  // Fill PHASE_N
  await page.getByLabel("Phase 編號").fill("10");

  // Click copy
  await page.getByRole("button", { name: /COPY/ }).click();

  // Toast appears
  await expect(page.getByText(/已複製/)).toBeVisible();
});

test("home shows last action after copy", async ({ page }) => {
  await page.goto("/prompts/factor-research/brainstorm/factor-brainstorm-parallel");
  await page.getByRole("button", { name: /COPY/ }).click();
  await page.goto("/");
  await expect(page.getByText("因子發想-多Agent平行Prompt")).toBeVisible();
});
