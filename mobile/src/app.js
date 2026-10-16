import {Capacitor} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {App} from '@capacitor/app';
import {messages} from './messages.js';
import {products} from './catalog.js';
import {initialState,normalizeState,changeQuantity,cartCount,cartTotal} from './state.js';
const key='sg-mobile-demo-v1';
let state=initialState(),query='',category='all',sort='recommended',timer,storageFailed=false;
let writes=Promise.resolve();
const text=()=>messages[state.language];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat(state.language==='es'?'es-CR':'en-US',{style:'currency',currency:'CRC',maximumFractionDigits:0}).format(value);
const main=document.getElementById('main');
const route=()=>location.hash.slice(1)||'tienda';
function notify(message) {
 clearTimeout(timer);const node=document.getElementById('notification');node.textContent=message;node.hidden=false;
 if(!storageFailed)timer=setTimeout(()=>{node.hidden=true;},3500);
}
function persist() {
 const value=JSON.stringify(state);
 writes=writes.then(async()=>{
  try{await Preferences.set({key,value});storageFailed=false;return true;}
  catch{storageFailed=true;notify(text().storageError);return false;}
 });
 return writes;
}
const paths={store:'<path d="M3 10h18M5 10v11h14V10M3 10l2-7h14l2 7M9 21v-7h6v7"/>',support:'<path d="M14 6a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4z"/>',business:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3"/>',cart:'<path d="M2 3h3l3 13h11l3-9H6M9 20h.01M18 20h.01"/>'};
function navigation() {
 const t=text(),current=route();
 document.getElementById('navigation').setAttribute('aria-label',t.navigation);
 document.getElementById('navigation').innerHTML=[['tienda','store'],['soporte','support'],['empresas','business'],['carrito','cart']].map(([r,k])=>`<a href="#${r}" ${current===r||(k==='store'&&current.startsWith('producto/'))?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${paths[k]}</svg><span>${t[k]}${k==='cart'?` <span class="count">(${cartCount(state)})</span>`:''}</span></a>`).join('');
}
function applyLanguage() {
 const t=text();document.documentElement.lang=state.language;document.title=t.page;document.getElementById('language').setAttribute('aria-label',t.language);
 document.getElementById('environment').textContent=t.demo;document.getElementById('footer-text').textContent=t.footer;
 document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===state.language)));
 if(storageFailed)notify(t.storageError);else document.getElementById('notification').hidden=true;
}
function cards() {
 const t=text();let list=products.filter(p=>(category==='all'||p.category===category)&&`${t[p.name]} ${t[p.description]}`.toLocaleLowerCase(state.language).includes(query.toLocaleLowerCase(state.language).trim()));
 if(sort!=='recommended')list=[...list].sort((a,b)=>sort==='ascending'?a.price-b.price:b.price-a.price);
 document.getElementById('results').textContent=`${list.length} ${t.results}`;
 document.getElementById('products').innerHTML=list.length?list.map(p=>`<article class="product"><a href="#producto/${p.id}"><img src="${p.image}" alt="${t.demoImage}" width="220" height="150"><h2>${t[p.name]}</h2><span class="muted">${t.detail}</span></a><p class="price">${money(p.price)}</p><button class="primary" data-add="${p.id}" aria-label="${t.add}: ${t[p.name]}">${t.add}</button></article>`).join(''):`<div class="empty"><p>${t.empty}</p><button data-reset>${t.reset}</button></div>`;
}
function store() {
 const t=text();main.innerHTML=`<h1>${t.intro}</h1><p class="muted">${t.subtitle}</p><div class="toolbar"><label class="search">${t.search}<input id="search" type="search" value="${escape(query)}" maxlength="100" autocomplete="off"></label><label>${t.category}<select id="category" aria-label="${t.category}">${['all','computers','networks','accessories'].map(k=>`<option value="${k}" ${category===k?'selected':''}>${t[k]}</option>`).join('')}</select></label><label>${t.sort}<select id="sort" aria-label="${t.sort}">${['recommended','ascending','descending'].map(k=>`<option value="${k}" ${sort===k?'selected':''}>${t[k]}</option>`).join('')}</select></label></div><p id="results" class="muted" role="status"></p><section id="products" class="products"></section>`;cards();
}
function detail(id) {
 const t=text(),p=products.find(p=>p.id===id);
 main.innerHTML=`<a class="button" href="#tienda">← ${t.back}</a>`;
 if(!p){main.innerHTML+=`<h1>${t.unavailable}</h1>`;return;}
 main.innerHTML+=`<article class="detail"><img src="${p.image}" alt="${t.demoImage}" width="400" height="260"><div><h1>${t[p.name]}</h1><p>${t[p.description]}</p><p class="price">${money(p.price)}</p><p class="muted">${t.taxes}</p><p class="stock">${t.stock}: ${p.stock}</p><button class="primary" data-add="${p.id}">${t.add}</button></div></article>`;
}
function cart() {
 const t=text(),items=products.filter(p=>state.cart[p.id]);
 main.innerHTML=`<h1>${t.cart} <span class="count">(${cartCount(state)})</span></h1>`;
 if(!items.length){main.innerHTML+=`<div class="empty"><h2>${t.emptyCart}</h2><p>${t.emptyCartText}</p><a class="button primary" href="#tienda">${t.back}</a></div>`;return;}
 main.innerHTML+=items.map(p=>`<article class="cart-line"><img src="${p.image}" alt="${t.demoImage}" width="76" height="76"><div><h2><a href="#producto/${p.id}">${t[p.name]}</a></h2><p>${money(p.price*state.cart[p.id])}</p><div class="quantity"><button data-quantity="${p.id}" data-delta="-1" aria-label="${t.decrease}: ${t[p.name]}">−</button><span aria-label="${t.quantity}">${state.cart[p.id]}</span><button data-quantity="${p.id}" data-delta="1" ${state.cart[p.id]>=p.stock?'disabled':''} aria-label="${t.increase}: ${t[p.name]}">+</button><button data-remove="${p.id}" aria-label="${t.remove}: ${t[p.name]}">${t.remove}</button></div></div></article>`).join('');
 main.innerHTML+=`<div class="summary"><span>${t.total}</span><span>${money(cartTotal(state))}</span></div><p class="notice">${t.checkoutNotice}</p><a class="button" href="#tienda">${t.back}</a>`;
}
function service(type) {
 const t=text(),draft=state.drafts[type];
 main.innerHTML=`<section class="service"><h1>${t[type+'Title']}</h1><p>${t[type+'Text']}</p><p class="notice">${t.draftNotice}</p><form data-service="${type}"><label>${t[type==='support'?'model':'company']}<input name="subject" maxlength="100" value="${escape(draft.subject||'')}" autocomplete="off"></label><label>${t[type==='support'?'issue':'equipment']}<textarea name="description" maxlength="1500">${escape(draft.description||'')}</textarea></label><div class="actions"><button class="primary" type="submit">${t.saveDraft}</button><button type="button" data-clear="${type}">${t.clearDraft}</button></div></form></section>`;
}
function render(focus=false) {
 applyLanguage();navigation();const r=route();
 if(r==='carrito')cart();else if(r==='soporte')service('support');else if(r==='empresas')service('business');else if(r.startsWith('producto/'))detail(r.slice(9));else store();
 if(focus){main.focus();window.scrollTo(0,0);}
}
main.addEventListener('input',e=>{
 if(e.target.id==='search'){query=e.target.value;cards();}
 const form=e.target.closest('[data-service]');if(form&&['subject','description'].includes(e.target.name)){state.drafts[form.dataset.service][e.target.name]=e.target.value;void persist();}
});
main.addEventListener('change',e=>{if(e.target.id==='category'){category=e.target.value;cards();}if(e.target.id==='sort'){sort=e.target.value;cards();}});
main.addEventListener('submit',async e=>{e.preventDefault();if(e.target.matches('[data-service]')&&await persist())notify(text().savedDraft);});
main.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-reset')){query='';category='all';sort='recommended';store();document.getElementById('search').focus();}
 if(b.dataset.add){const changed=changeQuantity(state,b.dataset.add,1);navigation();if(changed&&await persist())notify(text().added);else if(!changed)notify(text().limit);}
 if(b.dataset.quantity||b.dataset.remove){
  const id=b.dataset.quantity||b.dataset.remove,delta=b.dataset.remove?-(state.cart[id]||0):Number(b.dataset.delta);
  if(changeQuantity(state,id,delta)){cart();navigation();const selector=b.dataset.remove?'[data-remove]':`[data-quantity="${id}"][data-delta="${delta}"]`;const next=main.querySelector(selector);if(next&&!next.disabled)next.focus();else main.focus();await persist();}
 }
 if(b.dataset.clear){state.drafts[b.dataset.clear]={};service(b.dataset.clear);if(await persist())notify(text().cleared);}
});
document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>{state.language=b.dataset.language;render();void persist();}));
window.addEventListener('hashchange',()=>render(true));
async function start() {
 main.textContent=text().loading;
 try{const {value}=await Preferences.get({key});if(value)state=normalizeState(JSON.parse(value));}catch{storageFailed=true;}
 render();if(storageFailed)notify(text().storageError);
 if(Capacitor.getPlatform()==='android')await App.addListener('backButton',()=>{if(route()!=='tienda')location.hash='tienda';else void App.minimizeApp();});
}
void start();
