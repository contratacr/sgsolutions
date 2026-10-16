'use server';
import {revalidatePath} from 'next/cache';
import {guardarPerfilCompra,type EstadoDatosCompra} from '@/lib/guardar-perfil-compra';
export type {EstadoDatosCompra} from '@/lib/guardar-perfil-compra';
export async function guardarDatosCompra(_estado:EstadoDatosCompra,formulario:FormData):Promise<EstadoDatosCompra>{
 const estado=await guardarPerfilCompra(formulario);
 if(estado==='guardado'){revalidatePath('/cuenta');revalidatePath('/finalizar-compra');revalidatePath('/pagar');}
 return estado;
}
