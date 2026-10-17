import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`contadores aparecen juntos y permanecen al navegar ${idioma}`,async({page,context,baseURL,isMobile})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.addInitScript(()=>{
  localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'eurocomp-qa',cantidad:2}]));
  localStorage.setItem('sg-favoritos-invitado',JSON.stringify(['eurocomp-qa']));
  const frames:{favoritos:string;carrito:string}[]=[];
  Object.assign(window,{__contadoresFrames:frames});
  function observar(){const header=document.querySelector('.cabecera');if(header){const favoritos=header.querySelector('.favoritos-nav-movil .indicador-cantidad')?.textContent??'',carrito=header.querySelector('.carrito-cantidad')?.textContent??'';if(frames.length<3000)frames.push({favoritos,carrito});}requestAnimationFrame(observar);}
  requestAnimationFrame(observar);
 });
 const favorito=page.locator('.cabecera .favoritos-nav-movil .indicador-cantidad'),carrito=page.locator('.cabecera .carrito-cantidad');
 for(let vuelta=0;vuelta<2;vuelta++){
  await page.goto('/');await expect(favorito).toHaveText('1');await expect(carrito).toHaveText('2');
  if(isMobile){await page.locator('.menu-movil').click();await page.locator('.menu-panel-enlaces a[href="/tienda"]').click();}
  else await page.locator('.cabecera a[href="/tienda"]').filter({visible:true}).first().click();
  await expect(page).toHaveURL(/\/tienda/);await expect(carrito).toHaveText('2');await expect(favorito).toHaveText('1');
  await page.locator('.cabecera a[href="/"]').first().click();await expect(page).toHaveURL(/\/$/);
  const frames=await page.evaluate(()=>(window as unknown as {__contadoresFrames:{favoritos:string;carrito:string}[]}).__contadoresFrames);
  expect(frames.some(f=>f.favoritos==='1'&&f.carrito==='2')).toBe(true);
  expect(frames.filter(f=>(f.favoritos==='')!==(f.carrito===''))).toEqual([]);
  const primero=frames.findIndex(f=>f.favoritos==='1');expect(frames.slice(primero).every(f=>f.favoritos==='1'&&f.carrito==='2')).toBe(true);
 }
});
