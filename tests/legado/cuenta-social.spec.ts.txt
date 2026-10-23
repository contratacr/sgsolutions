import {test,expect} from '@playwright/test';

test.skip(!process.env.SG_TEST_OAUTH,'Requiere proveedor OAuth local de pruebas.');
for (const idioma of ['es','en'] as const) {
  test(`inicio OAuth con PKCE en ${idioma}`,async({page,context})=>{
    await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
    for (const proveedor of ['google','facebook'] as const) {
      await page.goto('/cuenta');
      const marca=proveedor==='google'?'Google':'Facebook';
      await page.getByRole('button',{name:`${idioma==='es'?'Continuar con':'Continue with'} ${marca}`,exact:true}).click();
      await expect(page).toHaveURL(/127\.0\.0\.1:3110\/auth\/v1\/authorize/);
      const url=new URL(page.url());
      expect(url.searchParams.get('provider')).toBe(proveedor);
      expect(url.searchParams.get('redirect_to')).toBe('https://sgsolutionscr.com/cuenta/confirmar');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('s256');
      if(proveedor==='facebook')expect(url.searchParams.get('scopes')).toBe('email');
    }
  });
}
