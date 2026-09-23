import {eventoAnalitica} from '@/lib/analitica-modelo';
import {registrarEvento} from '@/lib/analitica-servidor';
export async function POST(request:Request){
 const origen=request.headers.get('origin');
 let valido=false;
 try{const url=new URL(origen||'');valido=['http:','https:'].includes(url.protocol)&&url.host===(request.headers.get('host')||new URL(request.url).host);}catch{}
 if(!valido)return new Response(null,{status:403});
 if(!request.headers.get('cookie')?.split(';').some(c=>c.trim()==='sg-analitica=1'))return new Response(null,{status:403});
 if(Number(request.headers.get('content-length')||0)>2048)return new Response(null,{status:413});
 const texto=await request.text();if(texto.length>2048)return new Response(null,{status:413});
 let datos;try{datos=eventoAnalitica.safeParse(JSON.parse(texto));}catch{return new Response(null,{status:400});}
 if(!datos.success)return new Response(null,{status:400});
 try{await registrarEvento(datos.data);return new Response(null,{status:204});}catch{return new Response(null,{status:503});}
}
