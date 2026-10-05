/** Acepta formato internacional y agrega +506 a números locales de ocho dígitos. */
export function normalizarTelefonoWhatsApp(valor:string):string|null{
 if(!/^\+?[\d\s().-]+$/.test(valor.trim()))return null;
 let numero=valor.trim().replace(/[+\s().-]/g,'');
 if(numero.startsWith('00'))numero=numero.slice(2);
 if(numero.length===8&&!valor.trim().startsWith('+'))numero='506'+numero;
 if(numero.startsWith('506')&&numero.length!==11)return null;
 return /^[1-9]\d{6,14}$/.test(numero)?numero:null;
}
