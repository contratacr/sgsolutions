import 'server-only';
import {cookies} from 'next/headers';
/** Constant one-shot instruction, with no account identifier. */
export async function marcarLimpiezaCompra(){
 (await cookies()).set('sg-limpiar-compra','1',{path:'/',sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:60});
}
