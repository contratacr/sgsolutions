'use client';
import {useFormStatus} from 'react-dom';
import {useTranslations} from 'next-intl';
import {RefreshCw} from 'lucide-react';
export function ActualizarEurocomp({configurado}:{configurado:boolean}){
 const {pending}=useFormStatus();const t=useTranslations('Proveedores');
 return <button type="submit" className="boton boton-azul" disabled={pending||!configurado} aria-busy={pending}><RefreshCw size={18} aria-hidden="true"/>{t(pending?'actualizando':'actualizar')}</button>;
}
