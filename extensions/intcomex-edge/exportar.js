// Executes only in a dedicated Intcomex search tab, for one explicit export at a time.
export async function capturarExportacion(sku,firma){
 const pausa=ms=>new Promise(r=>setTimeout(r,ms));
 for(let i=0;i<40;i++){
  if(document.querySelector('input[type=password]'))return {error:'sesion'};
  if(document.body.innerText.includes('No encontramos resultados para tu búsqueda.'))return {error:'noEncontrado'};
  if([...document.querySelectorAll('h1')].some(h=>h.textContent.trim()===sku)&&document.body.innerText.includes(sku))break;
  await pausa(500);
 }
 if(![...document.querySelectorAll('h1')].some(h=>h.textContent.trim()===sku))return {error:'sesion'};
 // A changed adapter never clicks an unknown control: the admin can click Export manually.
 return new Promise(resolve=>{
  const original=URL.createObjectURL,clickOriginal=HTMLAnchorElement.prototype.click;const urls=new Set();let terminado=false,ultimaFirma=null;
  const panel=document.createElement('aside');panel.setAttribute('role','status');
  panel.style.cssText='position:fixed;bottom:20px;left:20px;right:20px;padding:18px;background:#10283a;color:white;z-index:2147483647;border:2px solid #ff6428;border-radius:12px;font:16px sans-serif';
  panel.textContent='SG Solutions: si la descarga no comienza, pulse Exportar Excel. / If the download does not start, click Export Excel.';
  document.body.append(panel);
  const registrar=e=>{const b=e.target.closest('button');if(b&&!panel.contains(b))ultimaFirma=b.innerHTML;};
  // The workbook is copied directly to the panel. Suppress only the matching
  // browser download, leaving unrelated links and downloads untouched.
  const omitirDescarga=e=>{const a=e.target.closest?.('a[href]');if(a&&urls.has(a.href))e.preventDefault();};
  document.addEventListener('click',registrar,true);
  document.addEventListener('click',omitirDescarga,true);
  function clickSinDescarga(){if(!urls.has(this.href))clickOriginal.call(this);}
  HTMLAnchorElement.prototype.click=clickSinDescarga;
  function fin(r){if(terminado)return;terminado=true;clearTimeout(timer);if(URL.createObjectURL===captura)URL.createObjectURL=original;if(HTMLAnchorElement.prototype.click===clickSinDescarga)HTMLAnchorElement.prototype.click=clickOriginal;document.removeEventListener('click',registrar,true);document.removeEventListener('click',omitirDescarga,true);panel.remove();resolve(r);}
  const timer=setTimeout(()=>fin({error:'exportacion'}),60000);
  function captura(blob){
   const url=original.call(URL,blob);urls.add(url);
   if(blob instanceof Blob&&blob.size>0&&blob.size<=4*1024*1024){
    void blob.arrayBuffer().then(buffer=>{const bytes=new Uint8Array(buffer);if(bytes[0]!==80||bytes[1]!==75)return;
     let texto='';for(let i=0;i<bytes.length;i+=8192)texto+=String.fromCharCode(...bytes.subarray(i,i+8192));
     fin({base64:btoa(texto),firma:ultimaFirma?.length<12000?ultimaFirma:null});
    }).catch(()=>fin({error:'exportacion'}));
   }return url;
  }
  URL.createObjectURL=captura;
  const visibles=[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled);
  const candidatos=firma?visibles.filter(b=>b.innerHTML===firma):visibles.filter(b=>/export|excel|download|descargar/i.test([b.title,b.getAttribute('aria-label'),b.textContent,...[...b.querySelectorAll('img')].map(i=>i.alt+' '+i.getAttribute('src'))].join(' ')));
  if(candidatos.length===1)candidatos[0].click();
 });
}
