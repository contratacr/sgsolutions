import {abrirCompraAprobada,limpiarAprobacionesTrasPrueba} from './aprobacion-fixture';
import { test, expect } from "@playwright/test";
import { esquemaContenido } from "../src/lib/contenido-modelo";
import contenido from "../src/lib/contenido-base.json";
import {costoEntrega} from '../src/lib/envio';
limpiarAprobacionesTrasPrueba();
for (const idioma of ["es", "en"])
  test(`ficha y checkout completos ${idioma}`, async ({ page }, info) => {
    const errores: string[] = [];
    page.on("pageerror", (e) => errores.push(e.message));
    await page.goto("/soluciones");
    if (idioma === "en")
      await page
        .getByRole("button", { name: "Read this page in English" })
        .click();
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator(".shop-producto").first()).toBeVisible();
    await page.locator(".shop-producto h3 a").first().click();
    await expect(page).toHaveURL(/\/soluciones\/[^/]+$/);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/sgsolutions\.soportecontratacr\.workers\.dev\/imagenes\//);
    await expect(page.locator(".ficha-codigo")).toContainText("21H2S1NH00");
    await page.locator(".ficha-agregar").click();
    await abrirCompraAprobada(page);
    await expect(page.locator("html")).toHaveAttribute("lang", idioma);
    const form = page.locator("main form");
    await form.locator("[name=nombre]").fill("Alex");
    await form.locator("[name=apellidos]").fill("Prueba");
    await form.locator("[name=correo]").fill("prueba@example.com");
    await form.locator("[name=telefono]").fill("88888888");
    await form.locator("[value=envio]").check();
    await expect(form.locator('label:has([value=envio])')).toContainText('Correos de Costa Rica');
    const importes = page.locator('.compra-resumen dl dd');
    const numero = async (indice: number) => Number((await importes.nth(indice).innerText()).replace(/\D/g, ''));
    expect(await numero(1)).toBe(4000);
    expect(await numero(2)).toBe((await numero(0)) + costoEntrega('envio'));
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
    await expect(form.locator("[value=tarjeta]")).toHaveCount(0);
    await expect(form.locator('.compra-tarjeta-proximamente')).toBeVisible();
    await form.locator("[value=sinpe]").check();
    await form.locator("[name=consentimiento]").check();
    await form.locator("[type=submit]").click();
    await expect(page.locator('main a[href^="https://wa.me/"]')).toHaveCount(0);
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
test('retiro no suma costo de envío', async ({page}) => {
  await page.goto('/soluciones/portatil');
  await page.locator('.ficha-agregar').click();
  await abrirCompraAprobada(page);
  const importes = page.locator('.compra-resumen dl dd');
  const numero = async (indice: number) => Number((await importes.nth(indice).innerText()).replace(/\D/g, ''));
  expect(await numero(1)).toBe(0);
  expect(await numero(2)).toBe(await numero(0));
});
test("contenido valida imágenes y protege administrador", async ({ page }) => {
  expect(esquemaContenido.safeParse(contenido).success).toBe(true);
  const malo = structuredClone(contenido);
  malo.casos[0].fotos[0].src = "javascript:alert(1)";
  expect(esquemaContenido.safeParse(malo).success).toBe(false);
  await page.goto("/panel/contenido");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/soluciones/no-existe");
  await expect(page.locator("main")).toBeVisible();
});
