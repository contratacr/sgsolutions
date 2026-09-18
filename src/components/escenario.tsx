'use client';

import {useEffect,useState,useRef,useCallback} from 'react';
import Escena3D from './escena-3d';

// One rendering surface; loading never swaps between different ribbon designs.
export function Escenario(){
 const [reducir,setReducir]=useState(false);
 const [fallo,setFallo]=useState(false);
 const puntero=useRef<[number,number]>([0,0]);
 const invalidar=useRef<()=>void>(()=>{});
 useEffect(()=>{
  const consulta=matchMedia('(prefers-reduced-motion: reduce)');
  const actualizar=()=>setReducir(consulta.matches);
  actualizar();consulta.addEventListener('change',actualizar);
  return ()=>consulta.removeEventListener('change',actualizar);
 },[]);
 const alCargar=useCallback(()=>{},[]);
 const alFallar=useCallback(()=>setFallo(true),[]);
 return <div className="escenario" data-escena={fallo?'fallo':'3d'}><div className="escena-grafico escena-original" aria-hidden="true">
  {!fallo&&<Escena3D activo={0} punteroRef={puntero} invalidarRef={invalidar} alCargar={alCargar} alFallar={alFallar} reducir={reducir}/>}
 </div></div>;
}
