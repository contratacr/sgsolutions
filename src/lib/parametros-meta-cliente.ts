'use client';
import {publicidadHabilitada} from './preferencias-medicion';
type Constructor={processAndCollectAllParams:(url?:string|null,getIpFn?:()=>Promise<string>)=>Promise<unknown>};
let tarea:Promise<void>|undefined;
/**
 * Recovers the Meta click ID (fbc) where the URL lost it, e.g. Instagram/Facebook
 * in-app browsers. It only writes first-party _fbc/_fbp cookies: the bundled
 * library (pinned, no CDN) makes no network request, and no IP lookup function
 * or personal data is passed to it. Call only after advertising consent.
 */
export function recuperarParametrosMeta(){
 if(typeof window==='undefined'||!publicidadHabilitada())return Promise.resolve();
 tarea??=(async()=>{
  try{
   const modulo=await import('meta-capi-param-builder-clientjs') as unknown as {clientParamBuilder?:Constructor;default?:{clientParamBuilder?:Constructor}};
   const constructor=modulo.clientParamBuilder??modulo.default?.clientParamBuilder;
   await constructor?.processAndCollectAllParams();
  }catch{/* Measurement must never affect navigation. */}
 })();
 return tarea;
}
/** The library scopes its cookies to the registrable domain, so deletion must try every parent domain. */
export function borrarCookiesMeta(){
 const partes=location.hostname.split('.'),seguro=location.protocol==='https:'?'; Secure':'';
 const dominios=['',...partes.map((_,i)=>`; Domain=.${partes.slice(i).join('.')}`)];
 for(const nombre of ['_fbp','_fbc'])for(const dominio of dominios)document.cookie=`${nombre}=; Max-Age=0; Path=/; SameSite=Lax${dominio}${seguro}`;
 tarea=undefined;
}
