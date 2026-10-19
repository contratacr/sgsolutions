import {createHmac} from 'node:crypto';
/** RFC 6238 generator used only with disposable local test secrets. */
export function codigoTotp(secreto,instante=Date.now()){
 const ab='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secreto.toUpperCase().replace(/=+$/,'')){const n=ab.indexOf(c);if(n<0)throw Error('TOTP_TEST_SECRET');bits+=n.toString(2).padStart(5,'0');}
 const key=Buffer.from((bits.match(/.{8}/g)??[]).map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(instante/30000)));const h=createHmac('sha1',key).update(counter).digest();const offset=h.at(-1)&15;return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
