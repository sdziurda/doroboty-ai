import { test, expect, type Page } from "@playwright/test";

async function choose(page: Page, name: string) {
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: `Wejdź jako ${name}`, exact: true }).click();
}

test("candidate answers Moja część and the employer sees the summary by requirement", async ({
  page,
}) => {
  await choose(page, "Anna Kowalska");
  await page.goto("/#/aplikuj/ai-product-manager");
  await page.getByRole("button", { name: "Odpowiedz na pytania rekrutera" }).click();
  for (let index = 0; index < 3; index++) {
    await page
      .locator(`#contribution-answer-${index}`)
      .fill("Nasz zespół przeprowadził pilotaż asystenta w obsłudze klienta.");
    await page.getByRole("button", { name: "Dalej: dopytanie" }).first().click();
    await expect(page.locator(".contribution-item").nth(index)).toContainText(
      "Która część tego projektu była Twoja?",
    );
    await page
      .locator(`#contribution-follow-${index}`)
      .fill("Sama porównałam 150 rozmów przed i po zmianie.");
  }
  await page
    .getByLabel("Dlaczego pasujesz do tej roli?")
    .fill("Prowadzę produkty AI w obsłudze klienta i chcę rozwijać pilotaże.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
  await expect(page).toHaveURL(/#\/app\/aplikacje/);

  await choose(page, "Karolina Wiśniewska");
  await page.goto("/#/app/kandydaci");
  await page
    .getByRole("link", { name: /Anna Kowalska/ })
    .first()
    .click();
  await page.getByRole("tab", { name: "Moja część" }).click();
  await expect(page.getByText("Symulacja AI: zestawienie powstało")).toBeVisible();
  await expect(
    page.getByText("„Sama porównałam 150 rozmów przed i po zmianie.”").first(),
  ).toBeVisible();
  await expect(page.getByText(/dopiero po dopytaniu/).first()).toBeVisible();
});

test("incomplete Moja część blocks submission until removed", async ({ page }) => {
  await choose(page, "Anna Kowalska");
  await page.goto("/#/aplikuj/ai-product-manager");
  await page.getByRole("button", { name: "Odpowiedz na pytania rekrutera" }).click();
  await page.locator("#contribution-answer-0").fill("Sama przygotowałam plan pilotażu.");
  await page
    .getByLabel("Dlaczego pasujesz do tej roli?")
    .fill("Prowadzę produkty AI w obsłudze klienta i chcę rozwijać pilotaże.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
  await expect(page.getByText(/Odpowiedz na pytanie 1 i dopytanie/)).toBeVisible();
  await expect(page).toHaveURL(/#\/aplikuj\//);
  await page.getByRole("button", { name: /Usuń odpowiedzi z sekcji/ }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
  await expect(page).toHaveURL(/#\/app\/aplikacje/);
});

test("employer generates requirement questions in the job editor", async ({ page }) => {
  await choose(page, "Karolina Wiśniewska");
  await page.goto("/#/app/oferty/nowa");
  await page.getByRole("button", { name: "Podpowiedz wymagania (symulacja AI)" }).click();
  await expect(page.getByLabel(/Wymaganie 3/)).not.toBeEmpty();
  await page.getByRole("button", { name: "Ułóż pytania do kandydatów (symulacja AI)" }).click();
  await expect(page.getByLabel("Pytanie do kandydata").first()).toHaveValue(/Wymaganie: „/);
});

test("Moja część fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await choose(page, "Anna Kowalska");
  await page.goto("/#/aplikuj/ai-product-manager");
  await page.getByRole("button", { name: "Odpowiedz na pytania rekrutera" }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
