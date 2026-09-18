'use client';
import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { iniciarSesion } from '@/app/acceso/acciones';
export function FormularioAcceso() {
  const t = useTranslations('Acceso');
  const [correo,setCorreo]=useState('');
  const [estado, accion, pendiente] = useActionState(iniciarSesion, '');
  return <form action={accion} className="formulario"><label>{t('correo')}<input name="correo" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} autoComplete="username" maxLength={254} required/></label><label>{t('clave')}<input name="clave" type="password" autoComplete="current-password" maxLength={256} required/></label>{estado && <p role="alert" className="aviso-formulario">{t(estado)}</p>}<button className="boton boton-azul" disabled={pendiente}>{t(pendiente ? 'entrando' : 'entrar')}</button></form>;
}
