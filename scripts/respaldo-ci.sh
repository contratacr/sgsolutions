#!/usr/bin/env bash
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = "true"
: "${DATABASE_URL:?}" "${RESPALDO_AGE_RECIPIENT:?}" "${R2_ENDPOINT:?}" "${R2_BUCKET_RESPALDOS:?}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}"
respaldo_temporal="$(mktemp)"
trap 'rm -f "$respaldo_temporal"' EXIT
respaldo_fecha="$(date -u +%Y%m%dT%H%M%SZ)"
# El volcado nunca se guarda sin cifrar ni se imprime en los logs.
docker run --rm -e DATABASE_URL postgres:17 sh -c 'pg_dump --dbname="$DATABASE_URL" --no-owner --no-acl --format=custom' | age -r "$RESPALDO_AGE_RECIPIENT" > "$respaldo_temporal"
test -s "$respaldo_temporal"
aws s3 cp "$respaldo_temporal" "s3://$R2_BUCKET_RESPALDOS/${SG_DESTINO:-produccion}/$respaldo_fecha.dump.age" --endpoint-url "$R2_ENDPOINT" --only-show-errors
echo "Respaldo cifrado subido. La restauración requiere una verificación independiente."
