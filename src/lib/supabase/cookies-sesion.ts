// Auth is handled only on the server; no browser Supabase client reads these cookies.
export function cookiesSesion(url:string){return {httpOnly:true,sameSite:'lax' as const,secure:process.env.SG_ENTORNO==='produccion'&&new URL(url).protocol==='https:'};}
