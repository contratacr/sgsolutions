import {expect,type Page} from '@playwright/test';
import es from '../../messages/es.json';
import en from '../../messages/en.json';

/** Recorre el formulario como cliente; no salta validaciones ni inicia pagos. */
export async function llegarAPago(page:Page,idioma='es'){
 const t=(idioma==='en'?en:es).Compra;
 await page.locator('[name=nombre]').fill('Cliente');
 await page.locator('[name=apellidos]').fill('Regresión');
 await page.locator('[name=correo]').fill('regresion@example.com');
 await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');
 await page.locator('[name=identificacion]').fill('123456789');
 await page.locator('input[name=modalidad][value=retiro]').check();
 await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
 await expect(page.locator('[data-compra-paso="1"]')).toBeVisible();
 await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
 await expect(page.locator('[data-compra-paso="2"]')).toBeVisible();
}
