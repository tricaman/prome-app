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

# Il catalogo accademico subito dopo lo schema e prima del codice nuovo: è
# chiuso, quindi un database senza catalogo è un onboarding che non si può
# completare — e sarebbe un guasto invisibile in sviluppo, dove il catalogo c'è
# da sempre. La semina è idempotente e non cancella nulla. Si invoca il file
# compilato e non `pnpm catalogo:semina`, che ricostruirebbe con un CLI che
# nell'immagine di produzione non c'è.
echo "→ catalogo accademico"
"${COMPOSE[@]}" run --rm -T api node dist/scripts/semina-catalogo.js </dev/null

echo "→ avvio"
"${COMPOSE[@]}" up -d

# La configurazione di Caddy arriva da file montati: `up -d` non si accorge che
# sono cambiati, quindi un dominio nuovo o un'intestazione diversa resterebbero
# inerti fino a un riavvio a mano — e il repository direbbe una cosa mentre la
# macchina ne fa un'altra. Il ricaricamento è a caldo: non chiude le
# connessioni aperte e non ripresenta i certificati.
echo "→ ricarico la configurazione di Caddy"
"${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile </dev/null

# Le immagini vecchie si accumulano: 38 GB si riempiono in fretta, e infatti
# si erano riempiti — 87% di disco, 70 immagini, 11 GB di cache di build.
#
# La riga di prima diceva `prune -f` senza `-a`, che rimuove **solo le immagini
# senza tag**: le nostre sono tutte etichettate con lo sha del commit, quindi
# non erano mai penzolanti e non veniva cancellato niente. Un comando che gira
# a ogni rilascio, esce con zero e non fa nulla.
#
# Con `-a` si rimuove ciò che nessun contenitore sta usando. Non si perde la
# possibilità di tornare indietro: le immagini vivono su ghcr, e `rilascia.sh`
# le ritira per sha quando serve.
sudo docker image prune -af --filter "until=48h" >/dev/null

# La cache di build non la tocca `image prune`, ed era il pezzo più grosso.
# Sulla macchina non si costruisce — le immagini arrivano dalla CI — quindi
# qui non c'è niente da riusare: quello che c'è è residuo.
sudo docker builder prune -af >/dev/null

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
    continue
  fi

  # L'immagine giusta non vuol dire ancora niente. Un contenitore che esce
  # all'avvio — una variabile obbligatoria che manca, e la validazione fail-fast
  # che fa il suo mestiere — viene rimesso in piedi da `restart: unless-stopped`
  # e continua a dichiarare l'immagine attesa mentre non serve nessuno. Guardare
  # solo l'etichetta lascia passare in verde proprio il guasto più comune, e a
  # scoprirlo resta la prova finale: cento secondi dopo, senza una riga di log.
  #
  # Un momento di respiro prima di guardare: un contenitore appena avviato è
  # legittimamente ancora in "created" per una frazione di secondo.
  sleep 2
  STATO=$(sudo docker inspect --format '{{.State.Status}}' "prome-${SERVIZIO}-1")
  RIAVVII=$(sudo docker inspect --format '{{.RestartCount}}' "prome-${SERVIZIO}-1")
  if [ "$STATO" != running ] || [ "$RIAVVII" -gt 0 ]; then
    echo "  ${SERVIZIO}: stato ${STATO}, riavvii ${RIAVVII} — non è in esercizio" >&2
    echo "  ── ultime righe di ${SERVIZIO} ──" >&2
    "${COMPOSE[@]}" logs --tail 40 --no-color "$SERVIZIO" >&2 || true
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
