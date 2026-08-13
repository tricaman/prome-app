# Messa in esercizio (E0.7)

Ambiente: **Hetzner, Nuremberg DC Park 1** — regione UE dichiarata, come chiede il work package. Ubuntu 24.04, 2 core, 3,7 GB di RAM, 38 GB di disco.

```
ssh prome-prod          # utente deploy; root è disabilitato di proposito
```

## Cosa gira

Cinque contenitori, una rete interna, **una sola cosa esposta**: Caddy sulle porte 80 e 443. Postgres e le due unità dell'API non pubblicano porte sull'host.

| servizio | ruolo |
| --- | --- |
| `caddy` | termina TLS, instrada i due domini, unico esposto |
| `web` | Next.js in modalità standalone |
| `api` | facciata REST — `APP_ROLE=app` |
| `worker` | meccanismi ricorrenti — `APP_ROLE=worker`, **stessa immagine**, nessun listener HTTP |
| `postgres` | database, volume persistente |

Le due unità dell'API escono dalla **stessa build** e si distinguono per configurazione d'avvio, come prescrive l'architettura: due immagini potrebbero divergere senza che nessuno se ne accorga.

## Pubblicare una versione

```bash
# dal Mac: sincronizza il sorgente (esclude node_modules, .env, build)
rsync -az --delete --exclude node_modules --exclude .next --exclude dist \
  --exclude .git --exclude .env --exclude apps/mobile --exclude documentation \
  ./ prome-prod:/home/deploy/prome/

ssh prome-prod
cd /home/deploy/prome
sudo docker build -f deploy/Dockerfile.api -t prome-api:latest .
sudo docker build -f deploy/Dockerfile.web \
  --build-arg NEXT_PUBLIC_URL_API=https://api.prome.app -t prome-web:latest .

cd deploy
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
```

L'indirizzo dell'API è un **argomento di build** e non una variabile del contenitore: finisce dentro il JavaScript che gira nel browser, quindi cambiarlo dopo non avrebbe effetto.

## Segreti

Vivono in `deploy/.env` **sulla macchina**, mai nel repository (`rsync` lo esclude, `.dockerignore` pure). Il modello è `.env.esempio`. Si generano sulla macchina:

```bash
openssl rand -base64 48   # BETTER_AUTH_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
```

L'API **si ferma all'avvio** se ne manca uno, invece di partire e sbagliare dopo. In particolare rifiuta di partire con `CANALE_EMAIL=sviluppo` in produzione: quel canale scrive i codici OTP nei log.

## Backup

`prome-backup.timer` gira ogni notte verso le 3:20 con un ritardo casuale. Quattordici copie conservate, in `/home/deploy/backup`, **fuori dai volumi di Docker** — un backup che vive dentro ciò che sta salvando non è un backup.

```bash
sudo ./backup.sh              # una copia adesso
sudo ./backup.sh --verifica   # copia + ripristino provato su un database usa e getta
systemctl list-timers prome-backup.timer
```

La verifica non è un di più: **ripristina davvero** su un database temporaneo e conta le tabelle ricreate. Un ripristino che non si prova è una speranza, non un piano di continuità. Lo script fallisce anche se il dump risulta troppo piccolo, che è il modo più comune in cui un backup fallisce in silenzio.

Prima di una modifica rischiosa allo schema, una copia a mano costa dieci secondi.

## Log

Formato JSON, rotazione per dimensione (3 file da 20 MB per servizio): ai volumi attesi sono molto più delle due settimane richieste.

```bash
sudo docker compose -f docker-compose.prod.yml logs -f api
sudo docker compose -f docker-compose.prod.yml logs --since 1h caddy
journalctl -u prome-backup -n 50        # esiti dei backup
```

Nei log non finiscono mai nomi o contenuti degli utenti: solo `utente_id`, `errorCode` ed `errorId`. Da una segnalazione si risale con `grep <errorId>`.

## Ripristino

```bash
gunzip -c /home/deploy/backup/prome-AAAAMMGG-HHMMSS.sql.gz \
  | sudo docker compose -f docker-compose.prod.yml exec -T postgres psql -U prome -d prome
```

Il dump è `--clean --if-exists`: ricrea sovrascrivendo, senza dover prima svuotare il database.

## Tornare indietro

Le immagini sono etichettate con `VERSIONE`. Costruendo con un'etichetta esplicita si torna indietro senza ricostruire:

```bash
sudo docker build -f deploy/Dockerfile.api -t prome-api:2026-08-13-1 .
VERSIONE=2026-08-13-1 sudo docker compose -f docker-compose.prod.yml up -d
```

**Attenzione alle migrazioni**: tornare a un'immagine precedente non annulla una migrazione già applicata. Uno schema si evolve solo in avanti, in modo compatibile con la versione ancora in esercizio.

## Cose ancora aperte

- **DNS**: `api.prome.app` e il dominio del sito devono risolvere a `46.224.215.1` **prima** di avviare Caddy, altrimenti la richiesta del certificato fallisce e si finisce nei limiti di frequenza di Let's Encrypt.
- **SMTP**: senza credenziali nessuno riceve il codice, quindi nessuno entra. Vale qualunque fornitore: l'adattatore è uno solo.
- **`prome.app` punta ancora a Vercel** (il sistema vecchio). Lo spostamento è il *cutover* previsto dal piano e va fatto di proposito, non di sorpresa.
- **Nessun controllo di versione**: il repository non è sotto git, quindi pubblicare non ha un punto a cui tornare che non sia una copia del sorgente.
- **Firewall**: SSH è aperto al mondo e prende migliaia di tentativi al giorno. Restringerlo nel pannello Hetzner al solo IP di chi amministra è più solido di fail2ban, perché blocca prima che sshd veda il pacchetto.
