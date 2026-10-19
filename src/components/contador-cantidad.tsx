'use client';
import {Minus,Plus} from 'lucide-react';
import {useTranslations} from 'next-intl';
export function ContadorCantidad({cantidad,cambiar,nombre,maximo=99}:{cantidad:number;cambiar:(valor:number)=>void;nombre:string;maximo?:number}){
 const t=useTranslations('Carrito');
 return <div className="contador-cantidad"><button type="button" disabled={cantidad<=1} onClick={()=>cambiar(cantidad-1)} aria-label={t('disminuir',{nombre})}><Minus size={16} aria-hidden="true"/></button><input type="number" min={1} max={maximo} value={cantidad} aria-label={t('cantidad',{nombre})} onChange={e=>{const valor=Number(e.target.value);if(Number.isInteger(valor)&&valor>=1&&valor<=maximo)cambiar(valor);}}/><button type="button" disabled={cantidad>=maximo} onClick={()=>cambiar(cantidad+1)} aria-label={t('aumentar',{nombre})}><Plus size={16} aria-hidden="true"/></button></div>;
}
