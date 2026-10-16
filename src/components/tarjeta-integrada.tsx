'use client';
import {CreditCard,LockKeyhole} from 'lucide-react';
import {useTranslations} from 'next-intl';
export function TarjetaIntegrada({disponible,pruebas=true}:{disponible:boolean;pruebas?:boolean}){
 const t=useTranslations('Compra');
 return <div className="tarjeta-integrada payFormTilopay">
  <header><span className="tarjeta-integrada-icono"><CreditCard size={24} aria-hidden="true"/></span><div><h3>{t('tarjetaDatos')}</h3><p>{t('tarjetaCreditoDebito')}</p></div><LockKeyhole size={18} aria-hidden="true"/></header>
  {(!disponible||pruebas)&&<p className="tarjeta-integrada-prueba">{t(disponible?'sdkPruebas':'sdkNoDisponible')}</p>}
  <input id="tlpy_payment_method" type="hidden"/>
  <select id="tlpy_saved_cards" hidden defaultValue="" aria-label={t('tarjetaGuardada')}><option value=""/></select>
  <div id="tlpy_card_payment_div" className="tarjeta-integrada-campos">
   <label className="tarjeta-integrada-numero" htmlFor="tlpy_cc_number">{t('tarjetaNumero')}<input id="tlpy_cc_number" type="text" inputMode="numeric" autoComplete="cc-number" placeholder={t("tarjetaNumeroEjemplo")} maxLength={23} disabled={!disponible} required/></label>
   <label htmlFor="tlpy_cc_expiration_date">{t('tarjetaVencimiento')}<input id="tlpy_cc_expiration_date" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder={t('tarjetaVencimientoEjemplo')} maxLength={5} onInput={e=>{const v=e.currentTarget.value.replace(/\D/g,'').slice(0,4);e.currentTarget.value=v.length>2?v.slice(0,2)+'/'+v.slice(2):v;}} disabled={!disponible} required/></label>
   <label htmlFor="tlpy_cvv">{t('tarjetaCvv')}<input id="tlpy_cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder={t("tarjetaCvvEjemplo")} minLength={3} maxLength={4} disabled={!disponible} required/></label>
  </div>
  <div id="tlpy_yappy_payment_div" hidden><input id="tlpy_phone_number" type="hidden"/></div>
  <p className="tarjeta-integrada-seguridad"><LockKeyhole size={14} aria-hidden="true"/>{t('tarjetaSeguridad')}</p>
 </div>;
}
