'use client';
import {createContext,useContext} from 'react';
import {empresa,enlaceWhatsApp as whatsapp,enlaceCorreo as correo} from '@/lib/empresa';
import {imagenesSitio} from '@/lib/imagenes-sitio';
const Contexto=createContext({contacto:empresa,imagenes:imagenesSitio});
export function ConfiguracionSitio({contacto,imagenes,children}:{contacto:typeof empresa;imagenes:typeof imagenesSitio;children:React.ReactNode}){return <Contexto.Provider value={{contacto,imagenes}}>{children}</Contexto.Provider>;}
export function useConfiguracionSitio(){const {contacto,imagenes}=useContext(Contexto);return {empresa:contacto,imagenes,enlaceWhatsApp:(mensaje:string)=>whatsapp(mensaje,contacto),enlaceCorreo:(asunto='',cuerpo='')=>correo(asunto,cuerpo,contacto)};}
