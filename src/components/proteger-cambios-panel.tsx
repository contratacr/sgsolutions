'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useRouter,usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {MarcoModal} from '@/components/marco-modal';
import * as Dialog from '@radix-ui/react-dialog';
import './proteger-cambios-panel.css';
const Contexto=createContext<{registrar:(id:symbol,pendiente:boolean)=>void;solicitar:(accion:()=>void)=>void}|null>(null);
export const useProteccionPanel=()=>useContext(Contexto);
export function ProtegerCambiosPanel({children}:{children:React.ReactNode}){
 const t=useTranslations('CambiosPanel'),router=useRouter(),ruta=usePathname();const pendientes=useRef(new Set<symbol>()),accion=useRef<(()=>void)|null>(null),permitir=useRef(false);const [abierto,setAbierto]=useState(false);
 const registrar=useCallback((id:symbol,pendiente:boolean)=>{if(pendiente)pendientes.current.add(id);else pendientes.current.delete(id);},[]);
 const solicitar=useCallback((continuar:()=>void)=>{if(!pendientes.current.size){continuar();return;}accion.current=continuar;setAbierto(true);},[]);
 useEffect(()=>{
  let indice=Number(history.state?.sgPanelIndice??0),restaurando=false;
  const push=history.pushState,replace=history.replaceState;
  replace.call(history,{...history.state,sgPanelIndice:indice,sgPanelUrl:location.href},'');
  history.pushState=function(data,unused,url){indice++;push.call(this,{...data,sgPanelIndice:indice,sgPanelUrl:new URL(String(url??location.href),location.href).href},unused,url);};
  history.replaceState=function(data,unused,url){replace.call(this,{...data,sgPanelIndice:indice,sgPanelUrl:new URL(String(url??location.href),location.href).href},unused,url);};
  const marcarRuta=()=>{if(history.state?.sgPanelUrl!==location.href){indice++;replace.call(history,{...history.state,sgPanelIndice:indice,sgPanelUrl:location.href},'');}};
  window.addEventListener('sg-panel-ruta',marcarRuta);
  const salir=(e:BeforeUnloadEvent)=>{if(pendientes.current.size&&!permitir.current){e.preventDefault();e.returnValue='';}};
  const click=(e:MouseEvent)=>{if(!pendientes.current.size||permitir.current||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const enlace=e.target instanceof Element?e.target.closest<HTMLAnchorElement>('a[href]'):null;if(!enlace||enlace.target==='_blank'||enlace.hasAttribute('download'))return;const url=new URL(enlace.href,location.href);if(!['http:','https:'].includes(url.protocol)||url.href===location.href||url.pathname===location.pathname&&url.search===location.search&&url.hash)return;e.preventDefault();e.stopImmediatePropagation();solicitar(()=>{if(url.origin===location.origin)router.push(url.pathname+url.search+url.hash);else location.assign(url.href);});};
  const submit=(e:SubmitEvent)=>{if(permitir.current||!pendientes.current.size)return;const form=e.target;if(!(form instanceof HTMLFormElement)||!form.matches('[data-cerrar-sesion]'))return;e.preventDefault();e.stopImmediatePropagation();solicitar(()=>form.requestSubmit());};
  const pop=(e:PopStateEvent)=>{const destino=typeof e.state?.sgPanelIndice==='number'?e.state.sgPanelIndice:indice-1;if(restaurando){restaurando=false;e.stopImmediatePropagation();return;}const delta=destino-indice;if(!pendientes.current.size||permitir.current||!delta){indice=destino;permitir.current=false;return;}e.stopImmediatePropagation();restaurando=true;history.go(-delta);solicitar(()=>history.go(delta));};
  const recibirPop=(e:Event)=>pop((e as CustomEvent<PopStateEvent>).detail);
  document.addEventListener('click',click,true);document.addEventListener('submit',submit,true);window.addEventListener('beforeunload',salir);window.addEventListener('sg-panel-popstate',recibirPop);
  return()=>{window.removeEventListener('sg-panel-ruta',marcarRuta);history.pushState=push;history.replaceState=replace;document.removeEventListener('click',click,true);document.removeEventListener('submit',submit,true);window.removeEventListener('beforeunload',salir);window.removeEventListener('sg-panel-popstate',recibirPop);};
 },[router,solicitar]);
 useEffect(()=>{window.dispatchEvent(new Event('sg-panel-ruta'));},[ruta]);
 return <Contexto.Provider value={{registrar,solicitar}}>{children}<Dialog.Root open={abierto} onOpenChange={setAbierto}><Dialog.Portal><Dialog.Overlay className="cambios-panel-fondo"/><MarcoModal className="cambios-panel-modal" onCloseAutoFocus={()=>{accion.current=null;}}><Dialog.Title>{t('titulo')}</Dialog.Title><Dialog.Description>{t('descripcion')}</Dialog.Description><div><Dialog.Close className="boton boton-azul">{t('seguir')}</Dialog.Close><button className="boton boton-contorno" onClick={()=>{const continuar=accion.current;accion.current=null;pendientes.current.clear();permitir.current=true;setAbierto(false);continuar?.();setTimeout(()=>{permitir.current=false;},0);}}>{t('salir')}</button></div></MarcoModal></Dialog.Portal></Dialog.Root></Contexto.Provider>;
}
