'use client';
import * as Dialog from '@radix-ui/react-dialog';
import {useTranslations} from 'next-intl';
import {X} from 'lucide-react';
import type {ComponentProps} from 'react';

export function MarcoModal({className='',children,cierreDeshabilitado=false,etiquetaCerrar,...props}:ComponentProps<typeof Dialog.Content>&{cierreDeshabilitado?:boolean;etiquetaCerrar?:string}){
 const t=useTranslations('Navegacion');
 return <Dialog.Content {...props} className={`modal-marco modal-${className.split(' ').at(-1)}`}><Dialog.Close className="modal-cierre-exterior" disabled={cierreDeshabilitado} aria-label={etiquetaCerrar||t('cerrar')}><X size={22} aria-hidden="true"/></Dialog.Close><div className={`${className} modal-cuerpo`}>{children}</div></Dialog.Content>;
}
