import {products} from './catalog.js';
export const initialState = () => ({version:1,language:'es',cart:{},drafts:{support:{},business:{}}});
export function normalizeState(value) {
  const state=initialState();
  if(!value || value.version!==1) return state;
  state.language=value.language==='en'?'en':'es';
  for(const product of products) {
    const quantity=value.cart?.[product.id];
    if(Number.isSafeInteger(quantity) && quantity>0) state.cart[product.id]=Math.min(quantity,product.stock);
  }
  for(const type of ['support','business']) for(const field of ['subject','description']) {
    const text=value.drafts?.[type]?.[field];
    if(typeof text==='string') state.drafts[type][field]=text.slice(0,field==='subject'?100:1500);
  }
  return state;
}
export function changeQuantity(state,id,delta) {
  const product=products.find(item=>item.id===id);
  if(!product || !Number.isSafeInteger(delta)) return false;
  const previous=state.cart[id]||0;
  const next=Math.max(0,Math.min(product.stock,previous+delta));
  if(next===previous) return false;
  if(next)state.cart[id]=next;else delete state.cart[id];
  return true;
}
export const cartCount=state=>Object.values(state.cart).reduce((total,value)=>total+value,0);
export const cartTotal=state=>products.reduce((total,item)=>total+item.price*(state.cart[item.id]||0),0);
