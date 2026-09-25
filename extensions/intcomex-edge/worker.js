/* global chrome */
import {capturarExportacion} from './exportar.js';
const origenPanel='http://127.0.0.1:3107';
let ocupado=false;
chrome.runtime.onMessage.addListener((m,sender,responder)=>{
 if(sender.frameId!==0||sender.tab?.url?.split('?')[0]!==origenPanel+'/panel/catalogo/sincronizar')return;
 if(!['estado','exportar','cancelar'].includes(m?.tipo))return;
 void ejecutar(m).then(responder).catch(()=>responder({error:'extensionError'}));return true;
});
async function ejecutar(m){
 if(m.tipo==='estado')return {version:'0.1.0'};
 if(m.tipo==='cancelar'){const {pestana}=await chrome.storage.session.get('pestana');if(pestana)await chrome.tabs.remove(pestana).catch(()=>{});await chrome.storage.session.remove('pestana');return {cancelado:true};}
 if(ocupado)return {error:'ocupado'};
 if(typeof m.sku!=='string'||!m.sku||m.sku.length>100||!/^[A-Za-z0-9()._-]+$/.test(m.sku))return {error:'codigo'};
 ocupado=true;
 try{
  const {firma}=await chrome.storage.local.get('firma');
  const tab=await chrome.tabs.create({url:'https://myservices.intcomex.com/es/XCR/store/search/?by=term&value='+encodeURIComponent(m.sku),active:true});
  await chrome.storage.session.set({pestana:tab.id});
  for(let n=0;n<60;n++){const t=await chrome.tabs.get(tab.id);if(t.status==='complete')break;await new Promise(r=>setTimeout(r,500));}
  const t=await chrome.tabs.get(tab.id);if(!t.url?.startsWith('https://myservices.intcomex.com/es/XCR/store/search/'))return {error:'sesion'};
  const salida=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:capturarExportacion,args:[m.sku,firma??null]});
  const resultado=salida[0]?.result??{error:'exportacion'};
  if(resultado.firma)await chrome.storage.local.set({firma:resultado.firma});
  if(resultado.base64||resultado.error==='noEncontrado'){await chrome.tabs.remove(tab.id);await chrome.storage.session.remove('pestana');}
  return {base64:resultado.base64,error:resultado.error};
 }finally{ocupado=false;}
}
