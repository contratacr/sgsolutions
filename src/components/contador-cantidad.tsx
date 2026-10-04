'use client';
import {Minus,Plus} from 'lucide-react';
import {useTranslations} from 'next-intl';
export function ContadorCantidad({cantidad,cambiar,nombre}:{cantidad:number;cambiar:(valor:number)=>void;nombre:string}){
 const t=useTranslations('Carrito');
 return <div className="contador-cantidad"><button type="button" disabled={cantidad<=1} onClick={()=>cambiar(cantidad-1)} aria-label={t('disminuir',{nombre})}><Minus size={16} aria-hidden="true"/></button><input type="number" min={1} max={99} value={cantidad} aria-label={t('cantidad',{nombre})} onChange={e=>{const valor=Number(e.target.value);if(Number.isInteger(valor)&&valor>=1&&valor<=99)cambiar(valor);}}/><button type="button" disabled={cantidad>=99} onClick={()=>cambiar(cantidad+1)} aria-label={t('aumentar',{nombre})}><Plus size={16} aria-hidden="true"/></button></div>;
}
