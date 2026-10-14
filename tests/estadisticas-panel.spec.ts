import {test,expect} from '@playwright/test';import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test('estadísticas, períodos, privacidad y fallos '+idioma,async({page,context,request})=>{
 const t=(idioma==='es'?es:en).Analitica,sub='00000000-0000-4000-8000-000000000001';const jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 await request.post('http://127.0.0.1:3123/__test/error',{data:{error:false}});await page.goto('/panel/estadisticas');
 await context.addCookies([{name:'sg-analitica',value:'1',domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(()=>localStorage.setItem('sg-medicion',JSON.stringify({analitica:true,publicidad:true})));
 const enviados:string[]=[];page.on('request',r=>{if(r.url().includes('/api/analitica'))enviados.push(r.url());});
 await page.goto('/tienda');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();expect(enviados).toHaveLength(0);expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);
 const antes=(await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos;
 const directo=await context.request.post('/api/analitica',{headers:{Origin:'http://127.0.0.1:3122'},data:{id:crypto.randomUUID(),sesion:crypto.randomUUID(),tipo:'pagina',ruta:'/tienda',detalle:'',dispositivo:'movil',idioma,campana:''}});expect(directo.status()).toBe(204);expect((await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos).toBe(antes);
 await page.goto('/panel/estadisticas');

 const tarjeta=(nombre:string)=>page.locator('main.estadisticas-panel:visible .estadisticas-tarjetas article').filter({has:page.locator('span').filter({hasText:new RegExp('^'+nombre+'$')})});
 await expect(tarjeta(t.visitas).locator('strong')).toHaveText('18');await expect(tarjeta(t.registrados).locator('strong')).toHaveText('9');await expect(tarjeta(t.nuevosRegistros).locator('strong')).toHaveText('3');await expect(tarjeta(t.clicsContacto).locator('strong')).toHaveText('6');await expect(tarjeta(t.pedidosPagados).locator('strong')).toHaveText('2');
 for(const texto of [t.ayudaPanel,t.detalleMedicion,t.pixelListo,t.configurar])await expect(page.locator('main.estadisticas-panel:visible')).not.toContainText(texto);
 await expect(page.getByRole('heading',{name:t.masVistos,exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:t.masComprados,exact:true})).toBeVisible();
 const comprados=page.locator('.estadisticas-lista').filter({has:page.getByRole('heading',{name:t.masComprados,exact:true})});
 await expect(comprados.locator('li strong')).toHaveText('5');
 await expect(page.getByRole('img',{name:t.graficoDescripcion.replace('{dias}','30')})).toBeVisible();await page.getByText(t.verDatos,{exact:true}).click();await expect(page.locator('.estadisticas-grafico table tbody tr')).toHaveCount(30);
 await page.getByRole('link',{name:t.periodo7,exact:true}).click();await expect(page).toHaveURL(/dias=7$/);await expect(tarjeta(t.visitas).locator('strong')).toHaveText('2');await expect(tarjeta(t.nuevosRegistros).locator('strong')).toHaveText('1');await expect(comprados.locator('li strong')).toHaveText('1');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'.privado/evidencias/estadisticas-'+idioma+'-'+test.info().project.name+'.png',fullPage:true});
 await request.post('http://127.0.0.1:3123/__test/error',{data:{error:true}});await page.reload();await expect(page.locator('main.estadisticas-panel:visible').getByRole('alert')).toContainText(t.noDisponible);await expect(tarjeta(t.visitas).locator('strong')).toHaveText('—');
 await request.post('http://127.0.0.1:3123/__test/error',{data:{error:false}});await page.getByRole('link',{name:t.reintentar,exact:true}).click();await expect(tarjeta(t.visitas).locator('strong')).toHaveText('2');
});
