# Spike LiveKit self-hosted (WP-14)

**Timebox: 2,5 giorni.** Criteri scritti prima di cominciare, il 16 agosto 2026. Non si modificano in corsa: un criterio riscritto a metà è un criterio superato per definizione.

## Perché esiste questo spike

Il piano di implementazione condiziona **tutta l'epica E5 all'esito di questo spike**: se non è nettamente positivo, l'audio esce dal perimetro e l'aula resta testuale — condizione che il piano dichiara «già consegnabile e utile da sola». La stima segna LiveKit self-hosted come «mai gestito prima», con impatto di 10 giorni se l'ipotesi non regge.

Non si sta valutando *se LiveKit funziona*: funziona. Si sta valutando se **questa macchina e questa persona** possono reggerlo, dove la persona ha una disponibilità misurata di ~2 ore in 4 settimane.

## Criteri di esito

Tutti e quattro i criteri bloccanti devono essere soddisfatti. Uno solo mancante alla scadenza del timebox chiude l'epica.

| # | Criterio | Bloccante | Esito |
|---|---|---|---|
| C1 | Tre partecipanti da **tre reti diverse** si sentono in aula per 10 minuti senza cadute né audio robotico | sì | da misurare |
| C2 | Almeno uno dei tre entra da una **rete restrittiva** (wifi universitario, rete aziendale, hotspot con NAT simmetrico) | sì | da misurare |
| C3 | Funziona **sia sul web sia sul mobile** (dev client su un dispositivo vero) | sì | da misurare |
| C4 | Le funzioni non-audio dell'aula restano al 100% con LiveKit spento (RE4) | sì | da misurare |
| C5 | Ore effettive di messa in opera | no, si registra | da misurare |
| C6 | CPU e banda della macchina a 3 e a 8 partecipanti | no, si registra | da misurare |
| C7 | Cosa serve per aggiornare la versione di LiveKit | no, si registra | da misurare |

C5, C6 e C7 non sono bloccanti ma vanno scritti: sono il costo ricorrente, cioè la cosa che lo spike deve davvero far emergere. Un audio che funziona benissimo e chiede due ore al mese di manutenzione è un no, non un sì.

## Regola di decisione

Alla scadenza del timebox, senza estensioni:

- **tutti i bloccanti soddisfatti** → E5 entra nel perimetro, si procede con E5.1 (la porta e l'API);
- **anche uno solo non soddisfatto** → l'audio esce dal perimetro, l'aula resta testuale, si passa a E8 (notifiche). La porta `PortaAudiochat` si costruisce **comunque** con il solo adattatore assente, così la cucitura esiste ed è provata.

L'esito va scritto qui sotto in ogni caso, anche — soprattutto — se negativo.

## Perimetro dello spike

Dentro:

- LiveKit in un contenitore accanto agli altri, isolato in un compose separato: **non si tocca `docker-compose.prod.yml`** finché lo spike non ha risposto;
- segnalazione dietro Caddy su un sottodominio dedicato, media in UDP diretto;
- una pagina di prova minima, senza integrazione con il dominio: nessun permesso, nessun token dalla nostra API. Serve a provare il trasporto, non il prodotto.

Fuori:

- `PortaAudiochat`, l'endpoint, i permessi, la misura dei minuti: sono E5.1, e si scrivono dopo;
- registrazione delle sessioni: vietata comunque da A3, solo transito;
- alta disponibilità, scaling, failover: la stima assume esplicitamente un nodo singolo senza questi requisiti.

## Note tecniche decise prima

- **Porta UDP singola con mux**, non un intervallo. Pubblicare 10.000 porte UDP in Docker crea un processo `docker-proxy` per porta e mette in ginocchio una macchina a due core. È l'errore da non fare.
- **Il media non passa da Caddy.** Caddy termina TLS per la sola segnalazione WebSocket; i pacchetti audio vanno in UDP direttamente sull'host.
- **TURN per ultimo.** Prima si prova che tre persone su reti normali si sentano (C1); solo dopo si affronta l'attraversamento delle reti restrittive (C2), che è dove sta il conflitto sulla porta 443 già occupata da Caddy.

## Esito

_Da compilare alla scadenza del timebox._

| | |
|---|---|
| Data di inizio | |
| Data di fine | |
| Ore effettive | |
| Esito | |
| Decisione | |
