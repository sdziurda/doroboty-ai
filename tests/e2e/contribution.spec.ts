import { test, expect, type Page } from "@playwright/test";

// Recording needs a real microphone and browser speech recognition, so these journeys
// cover everything around it: requirements, the voice-only section, blocking and the
// employer summary of Marek's prepared (text-only) example.

async function choose(page: Page, name: string) {
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: `Wejdź jako ${name}`, exact: true }).click();
}

test("employer sees Marek's Moja część summary by requirement", async ({ page }) => {
  await choose(page, "Karolina Wiśniewska");
  await page.goto("/#/app/kandydaci/application-example");
  await page.getByRole("tab", { name: "Moja część" }).click();
  await expect(page.getByText("Podsumowanie AI (symulacja)").first()).toBeVisible();
  await expect(page.getByText(/dopiero po dopytaniu/).first()).toBeVisible();
  await page.getByText("Nagrania i zapis odpowiedzi").first().click();
  await expect(
    page.getByText("Przykładowe dane: odpowiedź przygotowana tekstem, bez nagrania.").first(),
  ).toBeVisible();
});

test("Moja część is voice-only and blocks submission until removed", async ({ page }) => {
  await choose(page, "Anna Kowalska");
  await page.goto("/#/aplikuj/ai-product-manager");
  const open = page.getByRole("button", { name: "Odpowiedz na pytania rekrutera" });
  test.skip(await open.isDisabled(), "Browser without recording and speech recognition");
  await open.click();
  await expect(page.getByRole("button", { name: "Nagraj: odpowiedź na pytanie 1" })).toBeVisible();
  await expect(page.locator(".contribution-section textarea")).toHaveCount(0);
  await expect(page.getByText("Jedno podejście, limit: 2:00").first()).toBeVisible();
  await page
    .getByLabel("Dlaczego pasujesz do tej roli?")
    .fill("Prowadzę produkty AI w obsłudze klienta i chcę rozwijać pilotaże.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
  await expect(page.getByText(/Nagraj odpowiedź na pytanie 1 i dopytanie/)).toBeVisible();
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
  await choose(page, "Karolina Wiśniewska");
  await page.goto("/#/app/kandydaci/application-example");
  await page.getByRole("tab", { name: "Moja część" }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
