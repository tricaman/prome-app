#!/usr/bin/env bash
#
# Rilascio sulla macchina. Lo invoca la pipeline via SSH, ma è uno script
# normale: si può eseguire a mano allo stesso modo, ed è il motivo per cui sta
# qui invece che dentro il workflow.
#
# **Perché un file e non un heredoc.** Passare i comandi dallo stdin di `ssh`
# sembra funzionare finché uno di quei comandi legge lo stdin per conto suo:
# `docker compose run` lo fa, e si porta via tutte le righe successive. Lo
# script prosegue fino a EOF ed esce con zero, quindi il rilascio risulta
# riuscito **senza aver avviato niente**. Un guasto silenzioso che si scopre
# solo andando a guardare cosa gira davvero.
#
#   ./rilascia.sh <versione> <immagine-api> <immagine-web>

set -euo pipefail

VERSIONE=${1:-}
IMMAGINE_API=${2:-}
IMMAGINE_WEB=${3:-}

if [ -z "$VERSIONE" ] || [ -z "$IMMAGINE_API" ] || [ -z "$IMMAGINE_WEB" ]; then
  echo "uso: $0 <versione> <immagine-api> <immagine-web>" >&2
  exit 2
fi

export VERSIONE IMMAGINE_API IMMAGINE_WEB

cd "$(dirname "$0")"
COMPOSE=(sudo -E docker compose -f docker-compose.prod.yml)

echo "→ rilascio della versione ${VERSIONE}"

"${COMPOSE[@]}" pull api web
"${COMPOSE[@]}" up -d --no-deps postgres

# Le migrazioni PRIMA del codice nuovo, e con l'immagine nuova: uno schema
# indietro rispetto al codice che lo usa è il modo più rapido di far cadere
# tutto. `-T` e `</dev/null` perché questo comando non deve poter leggere lo
# stdin di nessuno.
echo "→ migrazioni"
"${COMPOSE[@]}" run --rm -T api npx prisma migrate deploy </dev/null

echo "→ avvio"
"${COMPOSE[@]}" up -d

# Le immagini vecchie si accumulano: 38 GB si riempiono in fretta.
sudo docker image prune -f --filter "until=168h" >/dev/null

# Il controllo che mancava. `up -d` può non sostituire niente — un compose che
# risolve a un'immagine diversa da quella appena tirata giù, una variabile che
# non è arrivata — e senza questa verifica il rilascio finirebbe in verde con
# in esercizio ancora il codice di prima.
echo "→ verifica di cosa gira davvero"
ATTESA_API="${IMMAGINE_API}:${VERSIONE}"
ATTESA_WEB="${IMMAGINE_WEB}:${VERSIONE}"
ERRORI=0
for SERVIZIO in api worker web; do
  ATTESA=$ATTESA_API
  [ "$SERVIZIO" = web ] && ATTESA=$ATTESA_WEB
  IN_ESERCIZIO=$(sudo docker inspect --format '{{.Config.Image}}' "prome-${SERVIZIO}-1")
  if [ "$IN_ESERCIZIO" != "$ATTESA" ]; then
    echo "  ${SERVIZIO}: gira ${IN_ESERCIZIO}, attesa ${ATTESA}" >&2
    ERRORI=$((ERRORI + 1))
  else
    echo "  ${SERVIZIO}: ok"
  fi
done

if [ "$ERRORI" -gt 0 ]; then
  echo "il rilascio non ha sostituito tutto: ${ERRORI} servizi indietro" >&2
  exit 1
fi

echo "→ rilasciata la versione ${VERSIONE}"
