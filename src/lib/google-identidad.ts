// Public OAuth client ID only. The client secret must never reach the browser.
export function clienteGoogleWeb(){
 const id=(process.env.GOOGLE_CLIENT_ID??'275918412086-haobe2on0me8v8shuqm16i8ic9uvrs3p.apps.googleusercontent.com').trim();
 return id&&/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)?id:null;
}
export async function hashNonceGoogle(nonce:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
