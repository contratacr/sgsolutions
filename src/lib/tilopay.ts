import 'server-only';
import {servicioPruebas} from './servicio-pruebas';
import { createClient } from '@supabase/supabase-js';

const api = 'https://app.tilopay.com/api/v1';

export function sdkTilopayHabilitado() {
  return process.env.SG_ENTORNO === 'produccion'
    ? process.env.TILOPAY_SDK_ACTIVO === '1'
    : process.env.NODE_ENV === 'development';
}

export function configuracionTilopay(requerirVerificacionReciente = true) {
  const usuario = process.env.TILOPAY_API_USER;
  const contrasena = process.env.TILOPAY_API_PASSWORD;
  const llave = process.env.TILOPAY_API_KEY;
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const verificado = Date.parse(process.env.TILOPAY_PRUEBA_VERIFICADA_EN ?? '');
  const modo = process.env.TILOPAY_MODO;
  if (modo !== 'pruebas' && modo !== 'produccion') return null;
  if (modo === 'pruebas' && process.env.SG_ENTORNO === 'produccion') return null;
  if (modo === 'produccion' && (process.env.SG_ENTORNO !== 'produccion' || !Number.isFinite(Date.parse(process.env.TILOPAY_PRODUCCION_VERIFICADA_EN ?? '')) || !process.env.TILOPAY_ENTORNO_RESPUESTA || process.env.TILOPAY_ENTORNO_RESPUESTA.toLowerCase() === 'test')) return null;
  // Tilopay comparte el host de pruebas y producción. Exigir revisión reciente del portal.
  if (modo === 'pruebas' && requerirVerificacionReciente && (!Number.isFinite(verificado) || verificado > Date.now() || Date.now() - verificado > 15 * 60 * 1000)) return null;
  if (!usuario || !contrasena || !llave || !url || !serviceRole) return null;
  return { usuario, contrasena, llave, url, serviceRole, modo, entornoRespuesta: modo === 'pruebas' ? 'Test' : process.env.TILOPAY_ENTORNO_RESPUESTA! };
}

export function basePedidos(config: NonNullable<ReturnType<typeof configuracionTilopay>>) {
  return createClient(config.url, config.serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function basePedidosAdministracion() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function respuestaJson(url: string, body: object, token?: string) {
  const prueba=servicioPruebas('tilopay');
  const destino=prueba?`${prueba}/${new URL(url).pathname.split('/').at(-1)}`:url;
  const respuesta = await fetch(destino, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!respuesta.ok) throw new Error(`TILOPAY_HTTP_${respuesta.status}`);
  return respuesta.json() as Promise<Record<string, unknown>>;
}

export async function tokenTilopay(config: NonNullable<ReturnType<typeof configuracionTilopay>>) {
  const respuesta = await respuestaJson(`${api}/login`, { apiuser: config.usuario, password: config.contrasena });
  if (typeof respuesta.access_token !== 'string' || !respuesta.access_token) throw new Error('TILOPAY_LOGIN_INVALIDO');
  return respuesta.access_token;
}

export async function iniciarTilopay(config: NonNullable<ReturnType<typeof configuracionTilopay>>, token: string, datos: object) {
  const respuesta = await respuestaJson(`${api}/processPayment`, { ...datos, key: config.llave }, token);
  if (respuesta.type !== '100' || typeof respuesta.url !== 'string') throw new Error('TILOPAY_NO_ENTREGO_URL');
  const destino = new URL(respuesta.url);
  if (destino.protocol !== 'https:' || !['secure.tilopay.com', 'securepayment.tilopay.com', 'app.tilopay.com'].includes(destino.hostname)) throw new Error(`TILOPAY_URL_INVALIDA:${destino.hostname}`);
  return destino.href;
}

export async function consultarTilopay(config: NonNullable<ReturnType<typeof configuracionTilopay>>, token: string, id: string) {
  return respuestaJson(`${api}/consult`, { key: config.llave, orderNumber: id, merchantId: '' }, token);
}

export async function tokenSdkTilopay(config: NonNullable<ReturnType<typeof configuracionTilopay>>) {
 if(!sdkTilopayHabilitado())throw new Error('SDK_NO_HABILITADO');
 if(config.modo==='produccion'&&process.env.SG_ENTORNO!=='produccion')throw new Error('SDK_ENTORNO_INVALIDO');
 const respuesta=await respuestaJson(`${api}/loginSdk`,{apiuser:config.usuario,password:config.contrasena,key:config.llave});
 if(typeof respuesta.access_token!=='string'||!respuesta.access_token)throw new Error('SDK_TOKEN_INVALIDO');
 return respuesta.access_token;
}
