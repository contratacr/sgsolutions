'use client';
import {createContext,useContext,type ReactNode} from 'react';
const SesionCuenta=createContext(false);
export function SesionCuentaProvider({iniciada,children}:{iniciada:boolean;children:ReactNode}){return <SesionCuenta.Provider value={iniciada}>{children}</SesionCuenta.Provider>;}
export function useSesionCuenta(){return useContext(SesionCuenta);}
