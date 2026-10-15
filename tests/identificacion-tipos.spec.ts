import es from '../messages/es.json';import en from '../messages/en.json';
import {test,expect} from '@playwright/test';
import {identificacionCompraValida} from '../src/lib/identificacion-compra';
import {datosClienteCompra} from '../src/lib/datos-cliente-compra';
test('tipos de Hacienda se validan también en servidor',()=>{
 for(const [tipo,id] of [['fisica','123456789'],['juridica','3101951810'],['dimex','12345678901'],['dimex','123456789012'],['nite','1234567890']]){
 for(const textos of [es,en]){expect(textos.Compra[tipo as keyof typeof textos.Compra]).toBeTruthy();expect(textos.Asesoria[tipo as keyof typeof textos.Asesoria]).toBeTruthy();}
 expect(identificacionCompraValida(tipo,id)).toBe(true);expect(datosClienteCompra.safeParse({nombre:'Ana',apellidos:'Prueba',correo:'qa@example.com',telefono:'+50686065342',modalidad:'retiro',consentimiento:'on',factura:'electronica',tipoIdentificacion:tipo,identificacion:id}).success).toBe(true);
 }
 for(const [tipo,id] of [['fisica','012345678'],['dimex','012345678901'],['dimex','1234567890'],['nite','123456789'],['otro','123456789']])expect(identificacionCompraValida(tipo,id)).toBe(false);
});
for(const idioma of ['es','en'])test(`selector y límite por identificación ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();await page.goto('/pagar');
 await page.locator('[name=nombre]').fill('Ana');await page.locator('[name=apellidos]').fill('Prueba');await page.locator('[name=correo]').fill('qa@example.com');await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');
 const tipo=page.locator('select[name=tipoIdentificacion]'),id=page.locator('input[name=identificacion]');
 for(const [valor,numero] of [['fisica','123456789'],['juridica','3101951810'],['dimex','123456789012'],['nite','1234567890']]){await tipo.selectOption(valor);await id.fill(numero+'999');await expect(id).toHaveValue(numero);expect(await id.evaluate((el:HTMLInputElement)=>el.checkValidity())).toBe(true);await id.fill('123');expect(await id.evaluate((el:HTMLInputElement)=>el.validity.patternMismatch)).toBe(true);}
 await tipo.selectOption('dimex');await id.fill('12345678901');expect(await id.evaluate((el:HTMLInputElement)=>el.checkValidity())).toBe(true);await tipo.selectOption('juridica');await id.fill('123456789');await id.evaluate((el:HTMLInputElement)=>el.reportValidity());await tipo.selectOption('fisica');await expect.poll(()=>id.evaluate((el:HTMLInputElement)=>el.validity.valid)).toBe(true);
 await page.getByRole('checkbox',{name:(idioma==='es'?es:en).Compra.facturaElectronicaOpcional,exact:true}).check();await id.fill('');await id.evaluate((el:HTMLInputElement)=>el.reportValidity());await id.fill('123456789');await page.getByRole('checkbox',{name:(idioma==='es'?es:en).Compra.facturaElectronicaOpcional,exact:true}).uncheck();await expect.poll(()=>id.evaluate((el:HTMLInputElement)=>el.validity.valid)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
