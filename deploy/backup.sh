#!/usr/bin/env bash
# Backup del database di Prome.
#
# Una copia al giorno, quattordici conservate — che è la richiesta di E0.7
# insieme al ripristino provato a tre giorni. Il dump è compresso e scritto
# **fuori dai volumi di Docker**: un backup che vive dentro ciò che sta
# salvando non è un backup.
#
# Uso:
#   ./backup.sh              esegue una copia
#   ./backup.sh --verifica   esegue una copia e ne prova il ripristino
set -euo pipefail

CARTELLA="${CARTELLA_BACKUP:-/home/deploy/backup}"
GIORNI_DA_CONSERVARE=14
cd "$(dirname "$0")"

# Il file dei segreti si **legge**, non si esegue: un `source` interpreta i
# valori come shell, e basta un `<` in un indirizzo mittente per rompere tutto
# — o, peggio, per eseguire qualcosa. Qui si estraggono le sole due chiavi che
# servono, senza dare alla shell l'occasione di interpretare il resto.
leggi_env() {
  sed -n "s/^$1=//p" ./.env | head -1 | sed 's/^["'"'"']//; s/["'"'"']$//'
}
POSTGRES_USER="$(leggi_env POSTGRES_USER)"
POSTGRES_DB="$(leggi_env POSTGRES_DB)"
[ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ] || {
  echo "[backup] ERRORE: POSTGRES_USER o POSTGRES_DB mancanti in .env" >&2; exit 1; }

mkdir -p "$CARTELLA"
NOME="prome-$(date +%Y%m%d-%H%M%S).sql.gz"
DESTINAZIONE="$CARTELLA/$NOME"

echo "[backup] dump di $POSTGRES_DB → $DESTINAZIONE"
# `pg_dump` dentro il contenitore, compressione fuori: così il file finisce
# sull'host senza passare da un volume intermedio.
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$DESTINAZIONE"

# Un dump vuoto è il modo più comune in cui un backup fallisce in silenzio:
# il comando esce con successo e il file c'è, ma dentro non c'è niente.
DIMENSIONE=$(stat -c%s "$DESTINAZIONE" 2>/dev/null || stat -f%z "$DESTINAZIONE")
if [ "$DIMENSIONE" -lt 1000 ]; then
  echo "[backup] ERRORE: il dump pesa $DIMENSIONE byte, è vuoto o troncato" >&2
  rm -f "$DESTINAZIONE"
  exit 1
fi
echo "[backup] fatto: $(du -h "$DESTINAZIONE" | cut -f1)"

if [ "${1:-}" = "--verifica" ]; then
  echo "[backup] verifica del ripristino su un database usa e getta"
  PROVA="verifica_ripristino_$(date +%s)"
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $PROVA" >/dev/null
  # Si ripristina davvero e si conta cosa è arrivato: un ripristino che non si
  # prova è una speranza, non un piano di continuità.
  gunzip -c "$DESTINAZIONE" | docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$PROVA" >/dev/null 2>&1 || true
  TABELLE=$(docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$PROVA" -tAc \
    "select count(*) from information_schema.tables where table_schema in ('profilo','bacheca','accesso')")
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE $PROVA" >/dev/null
  echo "[backup] ripristino verificato: $TABELLE tabelle ricreate"
  [ "$TABELLE" -gt 0 ] || { echo "[backup] ERRORE: il ripristino non ha prodotto tabelle" >&2; exit 1; }
fi

echo "[backup] pulizia delle copie oltre i $GIORNI_DA_CONSERVARE giorni"
find "$CARTELLA" -name 'prome-*.sql.gz' -mtime "+$GIORNI_DA_CONSERVARE" -delete
echo "[backup] copie conservate: $(find "$CARTELLA" -name 'prome-*.sql.gz' | wc -l)"
