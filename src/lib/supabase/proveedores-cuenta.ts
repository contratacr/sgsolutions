import 'server-only';
import {configuracionCuenta} from './configuracion-cuenta';

export async function proveedoresCuenta(): Promise<{google:boolean;facebook:boolean}> {
  const configuracion=configuracionCuenta();
  if (!configuracion) return {google:false,facebook:false};
  try {
    const respuesta=await fetch(`${configuracion.url}/auth/v1/settings`,{
      headers:{apikey:configuracion.llave},next:{revalidate:60},signal:AbortSignal.timeout(2000)
    });
    if (!respuesta.ok) return {google:false,facebook:false};
    const datos=await respuesta.json();
    return {google:datos.external?.google===true,facebook:datos.external?.facebook===true};
  } catch { return {google:false,facebook:false}; }
}
