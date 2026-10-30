import { test, expect } from "@playwright/test";
test("mineração vazia, filtros avançados e operação bloqueada sem serviços", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/mineracao");
  await expect(
    page.getByRole("heading", { name: "Mineração", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ambiente aguardando configuração"),
  ).toBeVisible();
  await expect(page.getByLabel("Mínimo de anúncios ativos")).toHaveValue("15");
  await expect(page.getByLabel("Preço máximo (R$)")).toHaveValue("67");
  await page.getByRole("button", { name: "Mais filtros" }).click();
  await expect(page.getByLabel("Subnicho", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "MINERAR PRODUTOS", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Configure o Supabase" }),
  ).toContainText("Configure o Supabase");
  expect(errors).toEqual([]);
});
test("formulário de cadastro tem campos de evidência e desconhecidos", async ({
  page,
}) => {
  await page.goto("/mineracao");
  await page
    .getByRole("button", { name: "Adicionar oferta", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByLabel("Evidências e limitações da coleta *"),
  ).toBeVisible();
  await expect(page.getByLabel("Preço observado (R$)")).toHaveValue("");
  await expect(page.getByLabel("Anúncios ativos observados")).toHaveValue("");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("todas as áreas carregam sem exceções de cliente", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const section of [
    "radar",
    "favoritos",
    "analise",
    "historico",
    "configuracoes",
    "login",
  ]) {
    await page.goto("/" + section);
    await expect(page.locator("main")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("celular e movimento reduzido", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/mineracao");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".radar-sweep")
      .evaluate((el) => getComputedStyle(el, "::after").animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(
    page.getByRole("link", { name: "Radar de Nichos" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Radar de Nichos" }).click();
  await expect(
    page.getByRole("heading", { name: "Radar de Nichos", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("API recusa chamadas sem origem e sem credenciais", async ({
  request,
}) => {
  expect((await request.post("/api/mine", { data: {} })).status()).toBe(403);
  expect((await request.get("/api/state")).status()).toBe(503);
});
