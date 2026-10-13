import {test,expect} from '@playwright/test';
test.skip(process.env.SG_TEST_CHECKOUT_OAUTH!=='1','Requiere proveedor OAuth/PKCE aislado.');
for(const idioma of ['es','en'])for(const cancelar of [false,true])test(`Google conserva pedido y retorno ${idioma} ${cancelar?'cancelación':'sesión'}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await expect(page.locator('.shop-orden select')).toBeEnabled();await page.locator('.shop-producto button').first().click();const carrito=await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'));
 await page.goto('/finalizar-compra');const boton=page.locator('.compra-acceso').getByRole('button',{name:idioma==='es'?'Continuar con Google':'Continue with Google',exact:true});await expect(boton).toBeVisible();await boton.click();await expect(page).toHaveURL(/127\.0\.0\.1:3114\/auth\/v1\/authorize/);
 const url=new URL(page.url());expect(url.searchParams.get('provider')).toBe('google');expect(url.searchParams.get('code_challenge_method')).toBe('s256');expect(url.searchParams.get('code_challenge')).toBeTruthy();expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:3107/cuenta/confirmar');
 const retorno=(await context.cookies('http://127.0.0.1:3108/cuenta')).find(c=>c.name==='sg-retorno-compra');expect(retorno?.httpOnly).toBe(true);expect(decodeURIComponent(retorno?.value??'')).toBe('/pagar');
 if(cancelar){await page.goto('http://127.0.0.1:3108/cuenta/confirmar?error=access_denied');await expect(page).toHaveURL(/\/cuenta\?retorno=.*error=cancelado/);await expect(page.locator('.cuenta-formulario [name=retorno]')).toHaveValue('/pagar');}
 else{await page.locator('.fixture-continuar').click();await expect(page).toHaveURL(/\/pagar$/);await expect(page.locator('.compra-acceso')).toHaveCount(0);await expect(page.locator('main form [name=nombre]')).toHaveValue('Ana');await expect(page.locator('main form [name=telefono]')).toHaveValue('+506 88883333');expect((await context.cookies()).some(c=>c.name==='sg-retorno-compra')).toBe(false);}
 expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe(carrito);
});
