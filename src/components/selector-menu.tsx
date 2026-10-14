'use client';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {Check,ChevronDown} from 'lucide-react';
export function SelectorMenu({etiqueta,valor,opciones,cambiar}:{etiqueta:string;valor:string;opciones:{valor:string;texto:string}[];cambiar:(valor:string)=>void}){
 const elegida=opciones.find(opcion=>opcion.valor===valor);
 return <Menu.Root><Menu.Trigger className="selector-menu-trigger" aria-label={etiqueta} aria-description={elegida?.texto} value={valor}><span>{elegida?.texto}</span><ChevronDown size={13} aria-hidden="true"/></Menu.Trigger><Menu.Portal><Menu.Content className="shop-orden-menu" align="start" sideOffset={6} collisionPadding={12} aria-label={etiqueta}><Menu.RadioGroup value={valor} onValueChange={cambiar}>{opciones.map(opcion=><Menu.RadioItem className="shop-orden-opcion" key={opcion.valor} value={opcion.valor} data-valor={opcion.valor}><span className="shop-orden-marca"><Menu.ItemIndicator><Check size={15} aria-hidden="true"/></Menu.ItemIndicator></span>{opcion.texto}</Menu.RadioItem>)}</Menu.RadioGroup></Menu.Content></Menu.Portal></Menu.Root>;
}
