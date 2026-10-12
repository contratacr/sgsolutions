const cuentasConfirmadas: Record<string, string> = {
  "CR71015102120010448776": "200-01-021-044877-2",
  "CR49015202001424646172": "001-42464617-2",
  "CR84010200009721479951": "972147995"
};

export function cuentaCorta(cuenta: {iban: string; cuentaCorta?: string}) {
  return cuenta.cuentaCorta || cuentasConfirmadas[cuenta.iban] || "";
}
