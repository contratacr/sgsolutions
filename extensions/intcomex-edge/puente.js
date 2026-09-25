/* global chrome */
// Local prototype only. No cookies, passwords, tokens or arbitrary URLs cross this bridge.
window.addEventListener('message',async event=>{
 if(event.source!==window||event.origin!==location.origin||location.pathname!=='/panel/catalogo/sincronizar')return;
 const m=event.data;if(m?.canal!=='sg-intcomex-solicitud'||typeof m.id!=='string'||m.id.length>80)return;
 if(!['estado','exportar','cancelar'].includes(m.tipo))return;
 try{const resultado=await chrome.runtime.sendMessage({tipo:m.tipo,sku:m.sku});window.postMessage({canal:'sg-intcomex-respuesta',id:m.id,resultado},location.origin);}
 catch{window.postMessage({canal:'sg-intcomex-respuesta',id:m.id,resultado:{error:'extensionError'}},location.origin);}
});
