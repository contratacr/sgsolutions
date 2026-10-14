'use client';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {Check,ChevronDown} from 'lucide-react';
import {useTranslations} from 'next-intl';

export function OrdenCatalogo({valor,cambiar,disabled}:{valor:string;cambiar:(valor:string)=>void;disabled:boolean}){
 const t=useTranslations('Comercio');
 const opciones=['recomendados','menor','mayor'] as const;
 const elegida=opciones.find(opcion=>opcion===valor)??'recomendados';
 return <div className="shop-orden"><span>{t('ordenar')}:</span><Menu.Root><Menu.Trigger className="shop-orden-trigger" disabled={disabled} value={valor} aria-label={`${t('ordenar')}: ${t(elegida)}`}><span>{t(elegida)}</span><ChevronDown size={12} aria-hidden="true"/></Menu.Trigger><Menu.Portal><Menu.Content className="shop-orden-menu" align="end" sideOffset={6} collisionPadding={12} aria-label={t('ordenar')}><Menu.RadioGroup value={valor} onValueChange={cambiar}>{opciones.map(opcion=><Menu.RadioItem className="shop-orden-opcion" key={opcion} value={opcion} data-orden={opcion}><span className="shop-orden-marca"><Menu.ItemIndicator><Check size={15} aria-hidden="true"/></Menu.ItemIndicator></span>{t(opcion)}</Menu.RadioItem>)}</Menu.RadioGroup></Menu.Content></Menu.Portal></Menu.Root></div>;
}
