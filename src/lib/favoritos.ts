'use client';
import {patronIdFavorito} from './favoritos-identidad';
import {useEffect,useState,useRef} from 'react';
import {useSesionCuenta} from '@/components/sesion-cuenta';
const claveInvitado='sg-favoritos-invitado';
function leer(clave:string):string[]{try{const v=JSON.parse(localStorage.getItem(clave)||'[]');return Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&patronIdFavorito.test(x)))].slice(0,100):[];}catch{return [];}}
export function useFavoritos(){
 const iniciada=useSesionCuenta();const [ids,setIds]=useState<string[]>([]),[error,setError]=useState(false),[listo,setListo]=useState(false);
 const clave=useRef(claveInvitado),cola=useRef(Promise.resolve());
 useEffect(()=>{let activo=true;async function cargar(){clave.current=claveInvitado;let guardados=leer(claveInvitado);if(iniciada){try{const r=await fetch('/api/favoritos',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();clave.current='sg-favoritos-'+d.usuario;const invitados=guardados;guardados=[...new Set([...d.ids,...invitados])].slice(0,100);if(invitados.length){const m=await fetch('/api/favoritos',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({importar:invitados})});if(!m.ok)throw Error();localStorage.removeItem(claveInvitado);}}catch{if(activo){setError(true);setListo(false);}return;}}
 if(activo){setIds(guardados);setListo(true);}}
 const sincronizar=(evento:Event)=>{const d=(evento as CustomEvent<{clave:string;ids:string[]}>).detail;if(d?.clave===clave.current&&activo)setIds(d.ids);};
 window.addEventListener('sg-favoritos-actualizados',sincronizar);
 void cargar();return()=>{activo=false;window.removeEventListener('sg-favoritos-actualizados',sincronizar);};},[iniciada]);
 function cambiar(id:string){if(!listo)return;const guardar=!ids.includes(id);if(guardar&&ids.length>=100)return;const nuevos=guardar?[...ids,id]:ids.filter(x=>x!==id);setIds(nuevos);if(guardar)window.dispatchEvent(new Event('sg-favorito-guardado'));try{localStorage.setItem(clave.current,JSON.stringify(nuevos));}catch{setError(true);}window.dispatchEvent(new CustomEvent('sg-favoritos-actualizados',{detail:{clave:clave.current,ids:nuevos}}));if(iniciada){cola.current=cola.current.then(async()=>{try{const r=await fetch('/api/favoritos',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({id,guardar})});if(!r.ok)throw Error();setError(false);}catch{setError(true);}});}}
 return {ids,cambiar,error,listo};
}
