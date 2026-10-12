import {test,expect,type BrowserContext} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
test.skip(!process.env.SG_TEST_USUARIOS,'Requiere Auth aislado; no consulta usuarios reales.');
async function sesion(context:BrowserContext,numero:number,idioma:string){
 const sub=`00000000-0000-4000-8000-${String(numero).padStart(12,'0')}`;
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
}
for(const idioma of ['es','en'] as const){test(`usuarios: búsqueda y roles simples ${idioma}`,async({page,context},info)=>{
 const t=(idioma==='es'?es:en).UsuariosPanel;
 await sesion(context,(idioma==='es'?1:2)+(info.project.name==='movil'?2:0),idioma);
 await page.goto('/panel/usuarios');
 await expect(page.getByRole('heading',{name:t.titulo,exact:true})).toBeVisible();
 await expect(page.locator('.usuario-tarjeta:visible')).toHaveCount(1);
 await expect(page.locator('.usuario-rol')).toHaveCount(0);
 await expect(page.locator('.usuario-etiquetas:visible')).toContainText(t.cliente);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.screenshot({path:`.privado/evidencias/usuarios-${idioma}-${info.project.name}.png`,fullPage:true});
 await page.getByLabel(t.buscar,{exact:true}).fill('nobody');
 await page.getByRole('button',{name:t.buscarBoton,exact:true}).click();
 await expect(page.locator('.usuarios-vacio:visible')).toBeVisible();
 await page.locator('.usuarios-busqueda a:visible').click();
 await expect(page.locator('.usuario-tarjeta:visible')).toHaveCount(1);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});}
test('usuarios: visitantes y comerciales no acceden',async({page,context})=>{
 await page.goto('/panel/usuarios');await expect(page).toHaveURL(/\/admin$/);
 await sesion(context,9,'es');await page.goto('/panel/usuarios');await expect(page).toHaveURL(/\/admin$/);
 await expect(page.locator('.usuario-tarjeta:visible')).toHaveCount(0);
});

for(const idioma of ['es','en'] as const){test(`gestión completa de una cuenta ${idioma}`,async({page,context},info)=>{
 const t=(idioma==='es'?es:en).UsuariosPanel;
 await sesion(context,(idioma==='es'?11:12)+(info.project.name==='movil'?2:0),idioma);
 await page.goto('/panel/usuarios');
 await page.locator('.usuario-administrar:visible').click();
 const dialogo=page.getByRole('dialog');await expect(dialogo).toBeVisible();
 await expect(dialogo.locator('input[type=password]')).toHaveCount(0);
 await dialogo.getByLabel(t.nombre,{exact:true}).fill('Nombre actualizado');
 await dialogo.getByRole('button',{name:t.guardarDatos,exact:true}).click();
 await expect(dialogo.getByRole('status')).toHaveText(t.datosActualizados);
 await expect(page.locator('.usuario-identidad:visible')).toContainText('Nombre actualizado');
 const correo=`actualizado-${idioma}-${info.project.name}@example.com`;
 await dialogo.getByLabel(t.correo,{exact:true}).fill(correo);
 await dialogo.getByRole('checkbox',{name:t.correoVerificado}).check();
 await dialogo.getByRole('button',{name:t.guardarDatos,exact:true}).click();
 await expect(page.locator('.usuario-identidad:visible')).toContainText(correo);
 await dialogo.getByLabel(t.accesoPanel,{exact:true}).selectOption('administrador');
 await dialogo.getByRole('checkbox',{name:t.confirmarAdmin}).check();
 await dialogo.getByRole('button',{name:t.guardarAcceso,exact:true}).click();
 await expect(dialogo.getByText(t.accesoActualizado,{exact:true})).toBeVisible();
 await expect(page.locator('.usuario-identidad:visible')).toContainText(t.administrador);
 await dialogo.getByRole('button',{name:t.enviarRecuperacion,exact:true}).click();
 await expect(dialogo.getByText(t.recuperacionEnviada,{exact:true})).toBeVisible();
 await dialogo.getByRole('button',{name:t.verHistorial,exact:true}).click();
 await expect(dialogo.getByText(t.eventoRecuperacion,{exact:true})).toBeVisible();
 const detalles=dialogo.locator('section').filter({hasText:t.seguridad}).locator('details');
 await detalles.locator('summary').click();
 await detalles.locator('input[name=confirmacion]').fill(correo);
 await detalles.getByRole('button',{name:t.bloquearUsuario,exact:true}).click();
 await expect(page.locator('.usuario-identidad:visible')).toContainText(t.estadoBloqueado);
 await expect(dialogo.getByLabel(t.accesoPanel,{exact:true})).toBeDisabled();
 await expect(dialogo.getByRole('button',{name:t.guardarAcceso,exact:true})).toBeDisabled();
 await detalles.locator('input[name=confirmacion]').fill(correo);
 await detalles.getByRole('button',{name:t.desbloquearUsuario,exact:true}).click();
 await expect(dialogo.getByText(t.desbloqueado,{exact:true})).toBeVisible();
 await expect(dialogo.getByLabel(t.accesoPanel,{exact:true})).toHaveValue('sin_acceso');
 await expect(dialogo.getByRole('button',{name:t.guardarAcceso,exact:true})).toBeDisabled();
 expect(await dialogo.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(false);
 await page.screenshot({path:`.privado/evidencias/gestion-usuarios-${idioma}-${info.project.name}.png`,fullPage:false});
 const borrar=dialogo.locator('.gestion-eliminar');await borrar.locator('summary').click();
 await borrar.locator('input[name=confirmacion]').fill('incorrecto@example.com');
 await borrar.getByRole('button',{name:t.eliminarUsuario,exact:true}).click();
 await expect(borrar.getByRole('alert')).toHaveText(t.confirmarAccion);
 await expect(page.locator('.usuario-tarjeta:visible')).toHaveCount(1);
 await borrar.locator('input[name=confirmacion]').fill(correo);
 await borrar.getByRole('button',{name:t.eliminarUsuario,exact:true}).click();
 await expect(page).toHaveURL(/resultado=eliminado/);
 await expect(page.locator('.usuario-tarjeta:visible')).toHaveCount(0);
 await expect(page.getByText(t.eliminado,{exact:true})).toBeVisible();
 const eventos=await (await page.request.get('http://127.0.0.1:3111/__test/events')).json();
 const recuperacion=eventos.findLast((e:{path:string;body:{email?:string}})=>e.path==='/auth/v1/recover'&&e.body.email===correo);
 expect(recuperacion).toBeTruthy();expect(recuperacion.query).toContain('flujo%3Drecuperar');
 const cambios=eventos.filter((e:{method:string;path:string})=>e.method==='PUT'&&e.path.includes('/admin/users/'));
 expect(cambios.every((e:{body:Record<string,unknown>})=>!('password' in e.body)&&!('role' in e.body))).toBe(true);
 expect(cambios.some((e:{body:{user_metadata?:{dato_previo?:string}}})=>e.body.user_metadata?.dato_previo==='conservar')).toBe(true);
});}

test('reenviar confirmación y no dar acceso a un correo sin confirmar',async({page,context},info)=>{
 const t=es.UsuariosPanel;await sesion(context,info.project.name==='movil'?27:17,'es');await page.goto('/panel/usuarios');
 await page.locator('.usuario-administrar:visible').click();const dialogo=page.getByRole('dialog');
 await dialogo.getByRole('button',{name:t.reenviarConfirmacion,exact:true}).click();
 await expect(dialogo.getByText(t.confirmacionEnviada,{exact:true})).toBeVisible();
 await dialogo.getByLabel(t.accesoPanel,{exact:true}).selectOption('administrador');
 await dialogo.getByRole('checkbox',{name:t.confirmarAdmin}).check();
 await dialogo.getByRole('button',{name:t.guardarAcceso,exact:true}).click();
 await expect(dialogo.locator('form:has(input[name=operacion][value=acceso])').getByRole('alert')).toHaveText(t.confirmarCorreo);
});
