'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {iniciarPixel,medir,preferenciasMedicion} from '@/lib/analitica-cliente';
import {rutaPublica} from '@/lib/analitica-modelo';
export function Medicion({pixel}:{pixel:string}){
 const ruta=usePathname(),t=useTranslations('Analitica');const [abierto,setAbierto]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{const frame=requestAnimationFrame(()=>setAbierto(!preferenciasMedicion()));return()=>cancelAnimationFrame(frame);},[]);
 useEffect(()=>{
  if(!rutaPublica(ruta))return;
  iniciarPixel(pixel);medir('pagina');if(ruta.startsWith('/tienda/'))medir('producto',ruta.split('/')[2]);
  const clic=(e:MouseEvent)=>{const el=e.target instanceof Element?e.target:null;const enlace=el?.closest<HTMLAnchorElement>('a[href]');if(enlace){const url=new URL(enlace.href,location.href);if(url.hostname==='wa.me')medir('whatsapp',enlace.closest('footer')?'footer':enlace.classList.contains('whatsapp-flotante')?'flotante':'contenido');else if(url.protocol==='mailto:'||url.hostname==='outlook.office.com')medir('correo');else if(url.protocol==='tel:')medir('telefono');else if(['www.google.com','www.waze.com'].includes(url.hostname))medir('mapa');else if(['www.instagram.com','www.facebook.com'].includes(url.hostname))medir('red_social',url.hostname);}
   if(el?.closest('.caso-galeria button'))medir('galeria');
  };
  const vistos=new Set<number>();const scroll=()=>{const max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;const porcentaje=scrollY/max*100;for(const n of [25,50,75,100])if(porcentaje>=n-1&&!vistos.has(n)){vistos.add(n);medir('scroll',String(n));}};
  document.addEventListener('click',clic);window.addEventListener('scroll',scroll,{passive:true});return()=>{document.removeEventListener('click',clic);window.removeEventListener('scroll',scroll);};
 },[ruta,pixel,version]);
 function elegir(analitica:boolean,publicidad:boolean){try{localStorage.setItem('sg-medicion',JSON.stringify({analitica,publicidad}));}catch{}document.cookie=`sg-analitica=${analitica?'1':'0'}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;if(!publicidad){window.fbq?.('consent','revoke');for(const nombre of ['_fbp','_fbc'])document.cookie=`${nombre}=; Max-Age=0; Path=/`; }if(!analitica){try{sessionStorage.removeItem('sg-medicion-sesion');}catch{}}setAbierto(false);setVersion(v=>v+1);}
 if(!rutaPublica(ruta))return null;
 return <><button className="medicion-preferencias" onClick={()=>setAbierto(true)}>{t('preferencias')}</button>{abierto&&<section className="medicion-aviso" aria-label={t('titulo')}><h2>{t('titulo')}</h2><p>{t('consentimiento')}</p><Link href="/privacidad">{t('privacidad')}</Link><div><button onClick={()=>elegir(false,false)}>{t('rechazar')}</button><button onClick={()=>elegir(true,false)}>{t('soloAnalitica')}</button><button onClick={()=>elegir(true,true)}>{t('aceptar')}</button></div></section>}</>;
}
