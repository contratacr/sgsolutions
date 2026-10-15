export type OpcionesSdk = Record<string, string | number>;
type SDK = {
 Init:(opciones:OpcionesSdk)=>Promise<{test?:number;methods?:{id:string;name:string;type?:string}[]}>;
 startPayment:()=>Promise<{message?:string}|undefined>;
};
declare global {interface Window {Tilopay?:SDK}}
let carga:Promise<SDK>|undefined;
export function cargarTilopaySdk():Promise<SDK>{
 if(window.Tilopay)return Promise.resolve(window.Tilopay);
 if(carga)return carga;
 carga=new Promise<SDK>((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://app.tilopay.com/sdk/v2/sdk_tpay.min.js';script.async=true;
  const timer=setTimeout(()=>{script.remove();carga=undefined;reject(new Error('SDK_TIMEOUT'));},15000);
  script.onload=()=>{clearTimeout(timer);if(window.Tilopay)resolve(window.Tilopay);else{carga=undefined;reject(new Error('SDK_UNAVAILABLE'));}};
  script.onerror=()=>{clearTimeout(timer);script.remove();carga=undefined;reject(new Error('SDK_UNAVAILABLE'));};
  document.head.appendChild(script);
 });
 return carga;
}
export async function pagarSdkPruebas(opciones:OpcionesSdk,metodo:string){
 const sdk=await cargarTilopaySdk();
 const inicio=await sdk.Init(opciones);
 if(Number(inicio.test)!==1)throw new Error('SDK_NOT_TEST');
 const tarjetas=inicio.methods?.filter(m=>m.type==='card')??[];
 const elegido=metodo?tarjetas.find(m=>m.id===metodo):tarjetas.length===1?tarjetas[0]:undefined;
 if(!elegido)throw new Error('SDK_METHOD_UNAVAILABLE');
 const campo=document.getElementById('tlpy_payment_method') as HTMLInputElement|null;
 if(!campo)throw new Error('SDK_FIELDS_MISSING');
 campo.value=elegido.id;campo.dispatchEvent(new Event('change',{bubbles:true}));
 const resultado=await sdk.startPayment();
 if(resultado?.message)throw new Error('SDK_PAYMENT_ERROR');
}
