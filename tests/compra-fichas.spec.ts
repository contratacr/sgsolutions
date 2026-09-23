import { test, expect } from "@playwright/test";
import { esquemaContenido } from "../src/lib/contenido-modelo";
import contenido from "../src/lib/contenido-base.json";
for (const idioma of ["es", "en"])
  test(`ficha y checkout completos ${idioma}`, async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto("/tienda");
    if (idioma === "en")
      await page
        .getByRole("button", { name: "Read this page in English" })
        .click();
    await expect(page.locator(".shop-producto").first()).toBeVisible();
    await page.locator(".shop-producto h3 a").first().click();
    await expect(page).toHaveURL(/\/tienda\/[^/]+$/);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".ficha-codigo")).toContainText("21H2S1NH00");
    await page.locator(".ficha-compra button").click();
    await page.locator('.ficha-compra a[href="/finalizar-compra"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", idioma);
    const form = page.locator("main form");
    await form.locator("[name=nombre]").fill("Alex");
    await form.locator("[name=apellidos]").fill("Prueba");
    await form.locator("[name=correo]").fill("prueba@example.com");
    await form.locator("[name=telefono]").fill("88888888");
    await form.locator("[value=envio]").check();
    await form.locator("[name=provincia]").selectOption("Alajuela");
    for (const k of ["canton", "distrito", "direccion"])
      await form.locator(`[name=${k}]`).fill("Atenas");
    await form.locator("[name=factura]").selectOption("electronica");
    for (const k of ["identificacion", "razonSocial", "direccionFiscal"])
      await form.locator(`[name=${k}]`).fill("Prueba");
    await form.locator("[name=correoFactura]").fill("factura@example.com");
    await form.locator("[value=transferencia]").check();
    await expect(form.locator(".compra-cuentas")).toHaveAttribute("open", "");
    await form.locator(".compra-cuentas summary").click();
    await expect(form.locator(".compra-cuentas")).not.toHaveAttribute("open");
    await form.locator("[value=sinpe]").check();
    await expect(form.locator(".compra-cuentas")).toHaveAttribute("open", "");
    await expect(form.locator(".compra-cuentas")).toContainText("6439 9417");
    await form.locator("[value=transferencia]").check();
    await expect(form.locator(".compra-cuentas")).toHaveAttribute("open", "");
    await expect(form).toContainText("CR71015102120010448776");
    await form.locator("[value=tarjeta]").check();
    await expect(form.locator(".compra-cuentas")).toHaveCount(0);
    await expect(form.locator(".compra-aviso")).toContainText(
      idioma === "es" ? "aún no están habilitados" : "not enabled yet",
    );
    await form.locator("[value=sinpe]").check();
    await form.locator("[name=consentimiento]").check();
    await form.locator("[type=submit]").click();
    const enviar = page.locator('main a[href^="https://wa.me/"]');
    await expect(enviar).toHaveAttribute("rel", "noopener noreferrer");
    const url = new URL((await enviar.getAttribute("href"))!);
    expect(url.pathname).toContain("50664399417");
    expect(url.searchParams.get("text")).toContain("Alex");
    expect(url.searchParams.get("text")).toContain("21H2S1NH00");
    await page.locator("main .pedido-volver").click();
    await expect(form.locator("[name=nombre]")).toHaveValue("Alex");
    await expect(form.locator("[name=correoFactura]")).toHaveValue(
      "factura@example.com",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: `evidencias/compra-${idioma}-${info.project.name}.png`,
      fullPage: true,
    });
    expect(errores).toEqual([]);
  });
test("contenido valida imágenes y protege administrador", async ({ page }) => {
  expect(esquemaContenido.safeParse(contenido).success).toBe(true);
  const malo = structuredClone(contenido);
  malo.casos[0].fotos[0].src = "javascript:alert(1)";
  expect(esquemaContenido.safeParse(malo).success).toBe(false);
  await page.goto("/panel/contenido");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/tienda/no-existe");
  await expect(page.locator("main")).toBeVisible();
});
