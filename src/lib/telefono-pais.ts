import {getCountryCallingCode,parsePhoneNumberFromString,validatePhoneNumberLength,type CountryCode} from 'libphonenumber-js/min';
export function longitudesTelefono(pais:CountryCode){if(pais==='CR')return [8];const codigo=getCountryCallingCode(pais);return Array.from({length:15-codigo.length},(_,i)=>i+1).filter(n=>validatePhoneNumberLength('+'+codigo+'9'.repeat(n),pais)===undefined);}
export function telefonoPosible(valor:string){const telefono=parsePhoneNumberFromString(valor,'CR');return Boolean(telefono?.isPossible()&&(telefono.country!=='CR'||telefono.nationalNumber.length===8));}
