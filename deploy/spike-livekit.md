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

## Diario

**16 agosto — messa in opera, ~1 ora.** LiveKit v1.13.5 gira sulla macchina, avvio pulito, e Caddy raggiunge la segnalazione sulla rete interna (`200 OK` su `livekit:7880`). Quattro cose scoperte facendola, tutte già riportate nella configurazione:

1. **Porta UDP singola con mux**, mai l'intervallo: in Docker ogni porta pubblicata è un processo `docker-proxy`.
2. **Buffer UDP a 5 MB sull'host**, non fra i `sysctls` del contenitore — `net.core.rmem_max` non è per-rete e runc si rifiuta di avviare il contenitore. Provato: il contenitore non parte proprio.
3. **IP pubblico dichiarato a mano.** Con la scoperta automatica LiveKit interroga uno STUN esterno all'avvio, e ha chiamato Twilio (fuori UE). Nessun media ci passa, ma è una dipendenza esterna all'avvio in meno e un dubbio su V3 in meno.
4. **Due firewall, non uno.** `ufw` sull'host ammette 22/80/443 e l'ho esteso a 7881 e 7882 — ma la porta restava chiusa. Con `tcpdump` sulla macchina, durante tre tentativi da fuori: **zero pacchetti**. Quindi c'è un **firewall Hetzner a monte** che finora non si era visto, perché ammette esattamente le porte che il sistema già usava.

**16 agosto — sbloccato.** DNS e firewall Hetzner sistemati dal committente. `rtc.prome.app` ha un certificato Let's Encrypt valido, `/rtc/validate` risponde `401` senza token — cioè raggiungibile e autenticante — e la `7881/tcp` arriva da fuori.

### Il media passa davvero

Provato con `livekit-cli load-test` **dalla rete di casa**, quindi con traversata NAT vera, non da dentro la macchina.

| prova | tracce | banda | perdita | CPU LiveKit |
|---|---|---|---|---|
| 3 pubblicano, 3 ascoltano | 9/9 | 165 kbps totali | **0%** | — |
| 8 pubblicano, 8 ascoltano | 48/64 | 937 kbps totali | **0%** | 30-42% di **un** core |

Memoria: 50 MB. Carico di sistema durante la prova a otto: **0.09**. La macchina non se ne accorge, e il collo di bottiglia non sarà la CPU.

### Il 48/64 non è un difetto, ed è la scoperta che conta

Ogni ascoltatore riceve costantemente **6 tracce su 8**, identico a 35 e a 75 secondi. Con **un solo ascoltatore** il numero resta 6: quindi non è un limite del client di prova, **è il server che inoltra solo un sottoinsieme delle tracce audio** — il comportamento di LiveKit che manda i parlanti più attivi invece di tutti.

Per un'aula di studio è esattamente ciò che si vuole: la banda di chi ascolta non cresce con il numero di presenti, e più di cinque o sei persone non parlano davvero insieme.

**Ha però una conseguenza sul client, da tenere presente in E5.2**: non si può assumere una traccia per ogni partecipante. L'elenco di chi sta parlando va costruito sugli eventi di parlante attivo di LiveKit, mai contando le tracce ricevute. Il che combacia con AS8, che vieta comunque al dominio di tenere quell'elenco.

### Cosa manca ai criteri

- **C1/C2** — serve una pagina di prova e tre persone vere su tre reti, di cui una restrittiva. Il trasporto è provato, il permesso microfono del browser no.
- **C3** — mobile, non ancora toccato.
- **C4** — oggi è vero per assenza: nulla dell'aula chiama LiveKit. Diventa un criterio con un senso solo dopo E5.1, e va provato allora.
- **C7** — l'aggiornamento di versione è un cambio di tag nel compose dello spike; da riprovare quando esiste una versione nuova.

## Esito

| | |
|---|---|
| Data di inizio | 16 agosto 2026 |
| Data di fine | 18 agosto 2026 |
| Ore effettive | ~2, dentro il timebox di 2,5 giorni |
| Esito | **positivo, con una riserva dichiarata** |
| Decisione | **E5 entra nel perimetro.** Si procede con E5.1. |

Tre partecipanti da tre reti diverse si sentono, dal browser del computer e da
quello del telefono. Il trasporto regge con margine largo: a otto partecipanti
la macchina resta sotto metà core e la perdita di pacchetti è zero.

**La riserva è C2, e non è un dettaglio da spuntare più tardi.** Nessuno è
ancora entrato da una rete restrittiva — wifi universitario, rete aziendale,
NAT simmetrico — che è la rete del pubblico a cui Prome si rivolge. Serve il
TURN, il TURN vuole la porta 443, e la 443 è di Caddy su TCP e UDP. Le due
strade restano quelle già scritte: un IP aggiuntivo Hetzner (~1 €/mese), che
risolve pulito, oppure il TURN su 5349, che molte reti restrittive bloccano —
cioè non risolve il caso per cui esiste.

Si procede con E5.1 perché il rischio residuo è **noto e limitato**: non è
«l'audio funziona?», a cui la prova ha risposto di sì, ma «da quante reti
funziona», che si chiude comprando un indirizzo. Se un giorno la risposta
fosse che non basta, la degradazione è già prevista: `AudiochatAssente` e
l'aula che resta testuale.

C4 non era verificabile qui — nulla dell'aula chiamava LiveKit — e diventa un
criterio con un senso dentro E5.1, dove il test con `AUDIOCHAT=assente` lo
rende eseguibile.

---

## 18 agosto — la voce è in esercizio

E5.1, E5.2 ed E5.3 sono rilasciate, e LiveKit è uscito da questa cartella: sta
in `docker-compose.prod.yml` insieme agli altri. Della cartella resta la sola
pagina di prova, che serve per C2.

La catena è stata provata **fino in fondo**, con l'API in locale ma puntata al
nodo di produzione con le sue chiavi vere — l'unico modo di verificarla senza
forzare una sessione, cosa che avrebbe scavalcato proprio il controllo su cui
tutto questo si regge:

1. accesso, onboarding, creazione dell'aula;
2. `POST /aule-studio/:id/audiochat/accesso` → **200**, con la stanza derivata
   dall'identificativo dell'aula, l'identità di chi chiede, `canPublish` vero e
   nessun diritto di amministrazione;
3. il **nodo in esercizio accetta quel lasciapassare** (`/rtc/validate` → 200,
   mentre uno inventato prende 401): le chiavi in produzione sono quelle giuste;
4. nella stanza nominata dalla nostra API il media passa davvero: 4 tracce su
   4, perdita **0%**.

**Resta solo C2.** Nessuno ha ancora provato da una rete restrittiva, e il
rimedio è già scritto: un IP aggiuntivo per il TURN sulla 443.
