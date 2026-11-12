import {VERSION_PREFERENCIAS_MEDICION} from '../../src/lib/preferencias-medicion';
/**
 * Store suites written before the privacy notice (2026-11-03) start with a saved choice, so the notice
 * does not cover filters, cards or buttons. Optional measurement stays off. Suites that test the notice
 * itself or count analytics events must not use this.
 */
export function sinAvisoPrivacidad(origen:string){
 return {cookies:[],origins:[{origin:new URL(origen).origin,localStorage:[{name:'sg-medicion',value:JSON.stringify({version:VERSION_PREFERENCIAS_MEDICION,analitica:false,publicidad:false,fecha:'2026-11-03T00:00:00.000Z'})}]}]};
}
