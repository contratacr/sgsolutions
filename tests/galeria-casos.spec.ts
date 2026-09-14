import {test,expect} from '@playwright/test';

test('galería abre la foto seleccionada, navega y devuelve el foco en ambos idiomas',async({page})=>{
 await page.goto('/casos-de-exito');
 for(const idioma of ['es','en']){
  if(idioma==='en')await page.getByRole('button',{name:'Read this page in English'}).click();
  const abrir=page.locator('.historia-fotos').nth(1).getByRole('button').nth(1);
  await abrir.click();
  const dialogo=page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await expect(dialogo.locator('img')).toHaveAttribute('src','/imagenes/casos/ecofarma-pos.webp');
  await dialogo.getByRole('button',{name:idioma==='es'?'Fotografía siguiente':'Next photo'}).click();
  await expect(dialogo.locator('img')).toHaveAttribute('src','/imagenes/casos/ecofarma-gabinete.webp');
  await page.keyboard.press('ArrowRight');
  await expect(dialogo.locator('img')).toHaveAttribute('src','/imagenes/casos/ecofarma-exterior.webp');
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(abrir).toBeFocused();
 }
});
