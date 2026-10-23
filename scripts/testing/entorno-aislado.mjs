// Vacíos explícitos impiden que Next recupere credenciales reales desde .env.local.
// Las configuraciones de laboratorio pueden sustituirlos con sus fixtures locales.
export const entornoAislado={
 SG_ENTORNO:'local',SG_META_ACTIVO:'0',META_ACCESS_TOKEN:'',META_DATASET_ID:'',
 SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',CUENTAS_SUPABASE_URL:'',CUENTAS_SUPABASE_ANON_KEY:'',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',
 BREVO_API_KEY:'',EUROCOMP_API_KEY:'',EUROCOMP_PASSWORD:'',
 TILOPAY_API_KEY:'',TILOPAY_API_USER:'',TILOPAY_API_PASSWORD:'',TILOPAY_MODO:'pruebas',
};
