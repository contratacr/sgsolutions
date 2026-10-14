'use client';
import {useEffect,useId} from 'react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
type Campo=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
function esCampo(elemento:EventTarget|null):elemento is Campo{return elemento instanceof HTMLInputElement||elemento instanceof HTMLSelectElement||elemento instanceof HTMLTextAreaElement;}

/** Conservar las restricciones HTML y presentar errores con el idioma de la app. */
export function ValidacionNativa(){
 const t=useTranslations('Validacion'),ruta=usePathname(),prefijo=useId();
 useEffect(()=>{
  const aplicarCorreo=()=>document.querySelectorAll<HTMLInputElement>('input[type=email]').forEach(campo=>{if(!campo.hasAttribute('pattern')){campo.pattern='[^\\s@]+@[^\\s@]+\\.[^\\s@]+';campo.dataset.patronCorreo='true';}});
  aplicarCorreo();const observador=new MutationObserver(aplicarCorreo);observador.observe(document.body,{childList:true,subtree:true});
  const errores=new Map<Campo,{elemento:HTMLSpanElement;anuncio?:HTMLSpanElement;descripcionId:string;mensaje:string;invalidOriginal:string|null}>();
  let contador=0,primero:Campo|null=null,activo=true,frame=0;
  function quitar(campo:Campo){
   const registro=errores.get(campo);if(!registro)return;
   registro.elemento.remove();registro.anuncio?.remove();campo.closest('label')?.classList.remove('validacion-opcion-con-error');
   if(campo.dataset.validacionNativa==='true'){
    if(campo.validationMessage===registro.mensaje)campo.setCustomValidity('');
    if(campo.getAttribute('aria-invalid')==='true'&&registro.invalidOriginal!=='true'){
     if(registro.invalidOriginal===null)campo.removeAttribute('aria-invalid');else campo.setAttribute('aria-invalid',registro.invalidOriginal);
    }
    const ids=(campo.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id&&id!==registro.descripcionId);
    if(ids.length)campo.setAttribute('aria-describedby',ids.join(' '));else campo.removeAttribute('aria-describedby');
    delete campo.dataset.validacionNativa;
   }
   errores.delete(campo);
  }
  function cancelarFoco(){cancelAnimationFrame(frame);frame=0;primero=null;}
  function focoCambiado(evento:Event){if(primero&&evento.target!==primero&&esCampo(evento.target))cancelarFoco();}
  function limpiar(evento:Event){
   cancelarFoco();if(!esCampo(evento.target))return;
   const formulario=evento.target.form;quitar(evento.target);
   requestAnimationFrame(()=>{if(!activo)return;for(const [campo,registro] of errores){
    if(campo.form!==formulario||campo.dataset.validacionNativa!=='true')continue;
    if(!campo.isConnected){quitar(campo);continue;}
    campo.setCustomValidity('');if(campo.validity.valid)quitar(campo);else campo.setCustomValidity(registro.mensaje);
   }});
  }
  function invalidar(evento:Event){
   if(!esCampo(evento.target))return;
   // Evitar la burbuja del navegador, que puede ignorar el idioma de la página.
   evento.preventDefault();
   const campo=evento.target;quitar(campo);
   for(const anterior of errores.keys())if(!anterior.isConnected)quitar(anterior);
   const error=campo.validity;
   let mensaje=t('invalido');
   if(error.valueMissing)mensaje=campo instanceof HTMLInputElement&&['checkbox','radio'].includes(campo.type)?t('casilla'):campo instanceof HTMLSelectElement?t('seleccion'):t('obligatorio');
   else if(error.typeMismatch)mensaje=campo instanceof HTMLInputElement&&campo.type==='email'?t('correo'):t('formato');
   else if(error.tooShort&&!(campo instanceof HTMLSelectElement))mensaje=t('minimo',{cantidad:campo.minLength});
   else if(error.tooLong&&!(campo instanceof HTMLSelectElement))mensaje=t('maximo',{cantidad:campo.maxLength});
   else if(error.rangeUnderflow||error.rangeOverflow||error.stepMismatch||error.badInput)mensaje=t('numero');
   else if(error.patternMismatch)mensaje=campo instanceof HTMLInputElement&&campo.dataset.longitudesTelefono?t('telefonoLongitud',{cantidad:campo.dataset.longitudesTelefono}):t('formato');
   if(campo instanceof HTMLInputElement&&campo.type==='email'&&!error.valueMissing&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value.trim()))mensaje=t('correo');
   const elemento=document.createElement('span');
   elemento.id=`validacion-${prefijo}-${++contador}`;elemento.className='validacion-campo-error';elemento.textContent=mensaje;elemento.setAttribute('role','alert');
   const grupo=campo.closest('.cuenta-campo');const etiqueta=campo.closest('label');
   let anuncio:HTMLSpanElement|undefined;
   if(grupo)grupo.append(elemento);
   else if(etiqueta){
    if(campo instanceof HTMLInputElement&&['checkbox','radio'].includes(campo.type))etiqueta.classList.add('validacion-opcion-con-error');
    // No incorporar el error al nombre accesible de la etiqueta.
    elemento.setAttribute('aria-hidden','true');elemento.removeAttribute('role');etiqueta.append(elemento);
    anuncio=document.createElement('span');anuncio.id=elemento.id+'-descripcion';anuncio.className='sr-only';anuncio.textContent=mensaje;anuncio.setAttribute('role','alert');(campo.form??etiqueta.parentElement)?.append(anuncio);
   }
   else (etiqueta??campo).insertAdjacentElement('afterend',elemento);
   const descripcionId=anuncio?.id??elemento.id;
   errores.set(campo,{elemento,anuncio,descripcionId,mensaje,invalidOriginal:campo.getAttribute('aria-invalid')});
   campo.setCustomValidity(mensaje);campo.setAttribute('aria-invalid','true');campo.dataset.validacionNativa='true';
   campo.setAttribute('aria-describedby',[(campo.getAttribute('aria-describedby')??''),descripcionId].filter(Boolean).join(' '));
   if(!primero){
    primero=campo;frame=requestAnimationFrame(()=>{if(activo&&primero?.isConnected&&primero.getClientRects().length)primero.focus();primero=null;});
   }
  }
  document.addEventListener('pointerdown',cancelarFoco,true);document.addEventListener('focusin',focoCambiado,true);
  document.addEventListener('invalid',invalidar,true);document.addEventListener('input',limpiar,true);document.addEventListener('change',limpiar,true);
  return ()=>{observador.disconnect();document.querySelectorAll<HTMLInputElement>('input[data-patron-correo]').forEach(campo=>{campo.removeAttribute('pattern');delete campo.dataset.patronCorreo;});activo=false;cancelarFoco();document.removeEventListener('pointerdown',cancelarFoco,true);document.removeEventListener('focusin',focoCambiado,true);document.removeEventListener('invalid',invalidar,true);document.removeEventListener('input',limpiar,true);document.removeEventListener('change',limpiar,true);for(const campo of errores.keys())quitar(campo);};
 },[t,ruta,prefijo]);
 return null;
}
