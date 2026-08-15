import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { creaValidationPipe } from '../src/common/pipes/validation.pipe';
import { registraCorpiBinari } from '../src/config/fastify';
import { PrismaService } from '../src/database/prisma.service';
import { CanaleEmailSviluppo } from '../src/infrastruttura/avvisi-in-uscita/canale-email-sviluppo';
import { RecapitoFattiDelGruppoService } from '../src/modules/gruppo/recapito-fatti.service';
import { RecapitoFattiService } from '../src/modules/aula-studio/recapito-fatti.service';

const GIORNO_MS = 24 * 60 * 60 * 1000;

/**
 * Gruppo (E7) — lo spazio che resta nel tempo.
 *
 * Scritti PRIMA del codice, come la regola impone dove il difetto è
 * invisibile a chi lo subisce. Qui lo è due volte: nessuno si accorge di
 * essere ammesso in un'aula in cui non avrebbe titolo, e **nessuno si accorge
 * di non essere stato allontanato** quando perde l'appartenenza — men che meno
 * la persona rimasta dentro, che continua a leggere una conversazione a cui
 * non ha più diritto.
 *
 * Le garanzie difese qui:
 * - G1/G4: il gruppo nasce con un nome vero e con qualcuno che può amministrarlo;
 * - G2: esiste sempre almeno un moderatore, e l'ultimo non si rimuove né si
 *   retrocede — nemmeno con due gesti concorrenti;
 * - G3: un utente compare al massimo una volta, quindi la seconda aggiunta è
 *   senza effetto e la doppia consegna di un fatto è innocua;
 * - G5: l'ateneo dello spazio è congelato alla creazione e non segue il
 *   profilo di chi l'ha creato;
 * - IG2/IG3: gli stati dell'invito sono terminali, e l'accettazione non crea
 *   il membro nella stessa transazione — 202, e il membro compare dopo;
 * - AS6: essere moderatore del gruppo non concede NULLA dentro un'aula;
 * - SE1: chi perde l'appartenenza mentre è dentro un'aula collocata viene
 *   allontanato, e chi ha un titolo proprio resta.
 */
describe('Gruppo (E7)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: CanaleEmailSviluppo;
  let recapito: RecapitoFattiDelGruppoService;
  /** L'outbox dell'aula: serve dove il titolo di ammissione viene da un invito. */
  let recapitoAula: RecapitoFattiService;

  let contatore = 0;
  const nuovoIndirizzo = () => `gruppo-${Date.now()}-${(contatore += 1)}@studenti.unibo.it`;

  type Richiesta = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    payload?: unknown;
  };

  const chiedi = (percorso: string, opzioni: Richiesta = {}) =>
    app.inject({
      url: percorso,
      method: 'GET',
      ...opzioni,
      headers: { 'x-lang': 'it', ...opzioni.headers },
    } as Parameters<NestFastifyApplication['inject']>[0]);

  const comeUtente = (token: string) => ({ authorization: `Bearer ${token}` });

  type Utente = { token: string; utenteId: string; indirizzo: string };

  async function utenteCompleto(universita = 'Università di Bologna'): Promise<Utente> {
    const indirizzo = nuovoIndirizzo();
    await chiedi('/accesso/codice', { method: 'POST', payload: { email: indirizzo } });
    const verifica = await chiedi('/accesso/verifica', {
      method: 'POST',
      payload: { email: indirizzo, codice: email.ultimoCodicePer(indirizzo) },
    });
    const token = verifica.json().data.token as string;
    const profilo = await chiedi('/profilo/me', {
      method: 'PUT',
      headers: comeUtente(token),
      payload: {
        nome: 'Marta',
        cognome: 'Rossi',
        universita,
        corso: 'Ingegneria informatica',
      },
    });
    return { token, utenteId: profilo.json().data.utenteId as string, indirizzo };
  }

  async function creaGruppo(token: string, dati: { nome?: string; visibilita?: string } = {}) {
    const risposta = await chiedi('/gruppi', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { nome: 'Ingegneria informatica – 2° anno', ...dati },
    });
    expect(risposta.statusCode).toBe(201);
    return risposta.json().data as { id: string; nome: string; ateneo: string | null };
  }

  const dettaglio = (token: string, gruppoId: string) =>
    chiedi(`/gruppi/${gruppoId}`, { headers: comeUtente(token) });

  const membroNelGruppo = async (token: string, gruppoId: string, utenteId: string) => {
    const risposta = await dettaglio(token, gruppoId);
    return risposta.json().data.membri.find((m: { utenteId: string }) => m.utenteId === utenteId);
  };

  /** Fa entrare qualcuno nel gruppo passando dall'invito, che è l'unica strada. */
  async function aggiungiAlGruppo(moderatore: Utente, gruppoId: string, invitato: Utente) {
    const invito = await chiedi(`/gruppi/${gruppoId}/inviti`, {
      method: 'POST',
      headers: comeUtente(moderatore.token),
      payload: { destinatario: invitato.indirizzo },
    });
    expect(invito.statusCode).toBe(201);
    const invitoId = invito.json().data.id as string;

    const accettazione = await chiedi(`/inviti-gruppo/${invitoId}/accettazione`, {
      method: 'POST',
      headers: comeUtente(invitato.token),
    });
    expect(accettazione.statusCode).toBe(202);

    // Il membro non nasce nella stessa transazione (IG3): il fatto viaggia
    // sulla corsia rapida, ed è qui che lo si fa viaggiare.
    await recapito.eseguiGiro();
    return invitoId;
  }

  async function creaAula(token: string, gruppoId?: string) {
    const risposta = await chiedi('/aule-studio', {
      method: 'POST',
      headers: comeUtente(token),
      payload: { titolo: 'Ripasso di Analisi 2' },
    });
    expect(risposta.statusCode).toBe(201);
    const aula = risposta.json().data as { id: string };

    if (gruppoId) {
      const collocazione = await chiedi(`/aule-studio/${aula.id}`, {
        method: 'PATCH',
        headers: comeUtente(token),
        payload: { gruppoId },
      });
      expect(collocazione.statusCode).toBe(200);
    }
    return aula;
  }

  const entraInAula = (token: string, aulaId: string) =>
    chiedi(`/aule-studio/${aulaId}/ingresso`, { method: 'POST', headers: comeUtente(token) });

  const partecipanteNellaSala = async (token: string, aulaId: string, utenteId: string) => {
    const risposta = await chiedi(`/aule-studio/${aulaId}/sala`, { headers: comeUtente(token) });
    return risposta
      .json()
      .data.partecipanti.find((p: { utenteId: string }) => p.utenteId === utenteId);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(creaValidationPipe());
    registraCorpiBinari(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    email = app.get(CanaleEmailSviluppo);
    recapito = app.get(RecapitoFattiDelGruppoService);
    recapitoAula = app.get(RecapitoFattiService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('creare un gruppo (G1, G4, G5)', () => {
    it('chi lo crea ne è membro moderatore fin dalla creazione', async () => {
      const creatore = await utenteCompleto();
      const gruppo = await creaGruppo(creatore.token);

      // G4: non esiste l'istante in cui un gruppo esiste senza nessuno che
      // possa invitare, rimuovere, promuovere.
      const io = await membroNelGruppo(creatore.token, gruppo.id, creatore.utenteId);
      expect(io).toBeDefined();
      expect(io.moderatore).toBe(true);
    });

    it('rifiuta un nome vuoto o di soli spazi (G1)', async () => {
      const creatore = await utenteCompleto();

      const vuoto = await chiedi('/gruppi', {
        method: 'POST',
        headers: comeUtente(creatore.token),
        payload: { nome: '   ' },
      });

      expect(vuoto.statusCode).toBe(400);
      expect(vuoto.json().errorCode).toBe('V001');
    });

    it('nasce al valore più chiuso, e la visibilità è sempre valorizzata (G5)', async () => {
      const creatore = await utenteCompleto();
      const gruppo = await creaGruppo(creatore.token);

      const risposta = await dettaglio(creatore.token, gruppo.id);
      expect(risposta.json().data.gruppo.visibilita).toBe('PRIVATO');
    });

    it('congela l\'ateneo alla creazione: non segue il profilo del creatore (G5)', async () => {
      const creatore = await utenteCompleto('Università di Bologna');
      const gruppo = await creaGruppo(creatore.token, { visibilita: 'ATENEO' });
      expect(gruppo.ateneo).toBe('Università di Bologna');

      // Il creatore si trasferisce.
      await chiedi('/profilo/me', {
        method: 'PUT',
        headers: comeUtente(creatore.token),
        payload: {
          nome: 'Marta',
          cognome: 'Rossi',
          universita: 'Politecnico di Milano',
          corso: 'Ingegneria informatica',
        },
      });

      // Il gruppo non cambia pubblico perché una persona ha cambiato ateneo.
      const dopo = await dettaglio(creatore.token, gruppo.id);
      expect(dopo.json().data.gruppo.ateneo).toBe('Università di Bologna');
    });

    it('l\'ateneo non è modificabile nemmeno chiedendolo', async () => {
      const creatore = await utenteCompleto();
      const gruppo = await creaGruppo(creatore.token, { visibilita: 'ATENEO' });

      const risposta = await chiedi(`/gruppi/${gruppo.id}`, {
        method: 'PATCH',
        headers: comeUtente(creatore.token),
        payload: { ateneo: 'Politecnico di Milano' },
      });

      // Campo non previsto dal contratto: la pipe lo rifiuta, non lo ignora.
      expect(risposta.statusCode).toBe(400);
      expect(risposta.json().errorCode).toBe('V001');
    });
  });

  describe('l\'insieme dei membri (G2, G3)', () => {
    it('l\'ultimo moderatore non si retrocede', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const altro = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, altro);

      const risposta = await chiedi(
        `/gruppi/${gruppo.id}/membri/${capo.utenteId}/moderazione`,
        { method: 'DELETE', headers: comeUtente(capo.token) },
      );

      expect(risposta.statusCode).toBe(422);
      expect(risposta.json().errorCode).toBe('GR004');
    });

    it('l\'ultimo moderatore non esce nemmeno da solo, ma promuovere gli riapre la strada', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const altro = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, altro);

      const bloccato = await chiedi(`/gruppi/${gruppo.id}/membri/${capo.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(capo.token),
      });
      expect(bloccato.statusCode).toBe(422);
      expect(bloccato.json().errorCode).toBe('GR004');

      // La via d'uscita è un verbo che il dominio possiede già: promuovere.
      await chiedi(`/gruppi/${gruppo.id}/membri/${altro.utenteId}/moderazione`, {
        method: 'POST',
        headers: comeUtente(capo.token),
      });
      const ora = await chiedi(`/gruppi/${gruppo.id}/membri/${capo.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(capo.token),
      });
      expect(ora.statusCode).toBe(200);

      const rimasti = await dettaglio(altro.token, gruppo.id);
      expect(rimasti.json().data.membri).toHaveLength(1);
      expect(rimasti.json().data.membri[0].moderatore).toBe(true);
    });

    it('due retrocessioni concorrenti non lasciano il gruppo senza moderatori', async () => {
      const uno = await utenteCompleto();
      const gruppo = await creaGruppo(uno.token);
      const due = await utenteCompleto();
      await aggiungiAlGruppo(uno, gruppo.id, due);
      await chiedi(`/gruppi/${gruppo.id}/membri/${due.utenteId}/moderazione`, {
        method: 'POST',
        headers: comeUtente(uno.token),
      });

      // Ciascuno dei due, da solo, vede una situazione lecita: c'è un altro
      // moderatore. È il blocco ottimistico a respingere il secondo.
      const [primo, secondo] = await Promise.all([
        chiedi(`/gruppi/${gruppo.id}/membri/${due.utenteId}/moderazione`, {
          method: 'DELETE',
          headers: comeUtente(uno.token),
        }),
        chiedi(`/gruppi/${gruppo.id}/membri/${uno.utenteId}/moderazione`, {
          method: 'DELETE',
          headers: comeUtente(due.token),
        }),
      ]);

      // Uno solo passa. **Quale rifiuto riceva l'altro dipende da dove cade
      // l'intreccio**, e tutti e tre sono legittimi: 403 se nel frattempo ha
      // perso il ruolo che gli dava diritto di chiedere, 409 se ha scritto su
      // una fotografia superata, 422 se vede sé stesso come ultimo moderatore.
      // Ciò che non è negoziabile è che il gruppo resti governabile.
      const esiti = [primo.statusCode, secondo.statusCode].sort();
      expect(esiti[0]).toBe(200);
      expect([403, 409, 422]).toContain(esiti[1]);

      const moderatori = await prisma.membro.count({
        where: { gruppoId: gruppo.id, moderatore: true },
      });
      expect(moderatori).toBe(1);
    });

    it('aggiungere due volte la stessa persona è senza effetto, non un errore (G3)', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const invitato = await utenteCompleto();

      await aggiungiAlGruppo(capo, gruppo.id, invitato);
      // Un secondo invito, accettato: G3 rende la seconda aggiunta inerte.
      await aggiungiAlGruppo(capo, gruppo.id, invitato);

      expect(
        await prisma.membro.count({ where: { gruppoId: gruppo.id, utenteId: invitato.utenteId } }),
      ).toBe(1);
    });

    it('solo un moderatore amministra i membri', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const semplice = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, semplice);

      const risposta = await chiedi(`/gruppi/${gruppo.id}/membri/${capo.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(semplice.token),
      });

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('GR003');
    });

    it('chi non è membro non vede un gruppo privato, e non sa che esiste', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const estraneo = await utenteCompleto();

      const risposta = await dettaglio(estraneo.token, gruppo.id);

      // «Esiste ma non puoi vederlo» racconta comunque che esiste.
      expect(risposta.statusCode).toBe(404);
      expect(risposta.json().errorCode).toBe('GR001');
    });
  });

  describe('inviti (IG1, IG2, IG3)', () => {
    it('l\'accettazione risponde 202 e il membro compare dopo', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const invitato = await utenteCompleto();

      const invito = await chiedi(`/gruppi/${gruppo.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(capo.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      const accettazione = await chiedi(`/inviti-gruppo/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      // 202 e non 201: dire 201 sarebbe mentire su un'entità che ancora non
      // esiste (IG3).
      expect(accettazione.statusCode).toBe(202);
      expect(
        await prisma.membro.count({ where: { gruppoId: gruppo.id, utenteId: invitato.utenteId } }),
      ).toBe(0);

      const stato = await chiedi(`/inviti-gruppo/${invitoId}`, {
        headers: comeUtente(invitato.token),
      });
      expect(stato.json().data.stato).toBe('ACCETTATO');
      expect(stato.json().data.membroCreato).toBe(false);

      await recapito.eseguiGiro();

      const lui = await membroNelGruppo(capo.token, gruppo.id, invitato.utenteId);
      expect(lui).toBeDefined();
      expect(lui.moderatore).toBe(false);
      const dopo = await chiedi(`/inviti-gruppo/${invitoId}`, {
        headers: comeUtente(invitato.token),
      });
      expect(dopo.json().data.membroCreato).toBe(true);
    });

    it('una seconda accettazione non ha effetto, e il fatto consegnato due volte nemmeno', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/gruppi/${gruppo.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(capo.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      await chiedi(`/inviti-gruppo/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });
      const seconda = await chiedi(`/inviti-gruppo/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });
      expect(seconda.statusCode).toBe(422);
      expect(seconda.json().errorCode).toBe('GR009');

      await recapito.eseguiGiro();
      // Si ri-consegna a mano lo stesso fatto: G3 lo rende innocuo.
      await prisma.fattoInUscitaDelGruppo.updateMany({
        where: { aggregatoId: invitoId },
        data: { consegnatoIl: null, tentativi: 0 },
      });
      await recapito.eseguiGiro();

      expect(
        await prisma.membro.count({ where: { gruppoId: gruppo.id, utenteId: invitato.utenteId } }),
      ).toBe(1);
    });

    it('un invito scaduto non si accetta più', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const invitato = await utenteCompleto();
      const invito = await chiedi(`/gruppi/${gruppo.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(capo.token),
        payload: { destinatario: invitato.indirizzo },
      });
      const invitoId = invito.json().data.id as string;

      await prisma.invitoAlGruppo.update({
        where: { id: invitoId },
        data: { scadeIl: new Date(Date.now() - GIORNO_MS) },
      });

      const risposta = await chiedi(`/inviti-gruppo/${invitoId}/accettazione`, {
        method: 'POST',
        headers: comeUtente(invitato.token),
      });

      expect(risposta.statusCode).toBe(422);
      expect(risposta.json().errorCode).toBe('GR008');
    });

    it('un invito rivolto a un altro indirizzo non si accetta', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const destinatario = await utenteCompleto();
      const estraneo = await utenteCompleto();
      const invito = await chiedi(`/gruppi/${gruppo.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(capo.token),
        payload: { destinatario: destinatario.indirizzo },
      });

      const risposta = await chiedi(`/inviti-gruppo/${invito.json().data.id}/accettazione`, {
        method: 'POST',
        headers: comeUtente(estraneo.token),
      });

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('GR010');
    });

    it('solo un moderatore invita', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const semplice = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, semplice);

      const risposta = await chiedi(`/gruppi/${gruppo.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(semplice.token),
        payload: { destinatario: nuovoIndirizzo() },
      });

      expect(risposta.statusCode).toBe(403);
      expect(risposta.json().errorCode).toBe('GR003');
    });
  });

  describe('l\'appartenenza produce effetto sull\'aula (IA4, AS6)', () => {
    it('un membro entra in un\'aula collocata senza alcun invito all\'aula', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);
      const membro = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, membro);

      const ingresso = await entraInAula(membro.token, aula.id);

      expect(ingresso.statusCode).toBe(200);
    });

    it('chi non è del gruppo resta fuori dall\'aula collocata', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);
      const estraneo = await utenteCompleto();

      const ingresso = await entraInAula(estraneo.token, aula.id);

      expect(ingresso.statusCode).toBe(403);
      expect(ingresso.json().errorCode).toBe('AS012');
    });

    it('il moderatore del GRUPPO entra in sola lettura: nessun permesso derivato (AS6)', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const altroModeratore = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, altroModeratore);
      await chiedi(`/gruppi/${gruppo.id}/membri/${altroModeratore.utenteId}/moderazione`, {
        method: 'POST',
        headers: comeUtente(capo.token),
      });

      // L'aula la crea qualcun altro: chi modera il gruppo non è il padrone
      // dell'aula, e il core non ha modo di sapere che moderi il gruppo.
      const padroneDellAula = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, padroneDellAula);
      const aula = await creaAula(padroneDellAula.token, gruppo.id);

      await entraInAula(altroModeratore.token, aula.id);

      const lui = await partecipanteNellaSala(
        padroneDellAula.token,
        aula.id,
        altroModeratore.utenteId,
      );
      expect(lui.moderatore).toBe(false);
      expect(lui.solaLettura).toBe(true);
      expect(lui.permessi).toEqual({ parlare: false, scrivere: false, caricare: false });
    });

    it('colloca l\'aula solo chi è moderatore dell\'aula e membro del gruppo', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const estraneo = await utenteCompleto();
      const aulaDiUnEstraneo = await creaAula(estraneo.token);

      const risposta = await chiedi(`/aule-studio/${aulaDiUnEstraneo.id}`, {
        method: 'PATCH',
        headers: comeUtente(estraneo.token),
        payload: { gruppoId: gruppo.id },
      });

      expect(risposta.statusCode).toBe(403);
    });
  });

  describe('la decadenza dell\'appartenenza raggiunge chi è già dentro (SE1)', () => {
    it('chi perde l\'appartenenza sparisce dai partecipanti dell\'aula collocata', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);
      const membro = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, membro);
      await entraInAula(membro.token, aula.id);
      expect(await partecipanteNellaSala(capo.token, aula.id, membro.utenteId)).toBeDefined();

      await chiedi(`/gruppi/${gruppo.id}/membri/${membro.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(capo.token),
      });

      // Chi è dentro non farà alcuna nuova richiesta: l'informazione deve
      // andargli incontro, e viaggia sulla corsia rapida.
      await recapito.eseguiGiro();

      expect(await partecipanteNellaSala(capo.token, aula.id, membro.utenteId)).toBeUndefined();
    });

    it('e non rientra', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);
      const membro = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, membro);
      await entraInAula(membro.token, aula.id);

      await chiedi(`/gruppi/${gruppo.id}/membri/${membro.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(capo.token),
      });
      await recapito.eseguiGiro();

      const ritorno = await entraInAula(membro.token, aula.id);
      expect(ritorno.statusCode).toBe(403);
    });

    it('ma chi era dentro per un invito proprio resta: quel titolo non dipende dal gruppo', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);
      const doppioTitolo = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, doppioTitolo);

      // Entra con un invito all'AULA, non per appartenenza al gruppo.
      const invitoAula = await chiedi(`/aule-studio/${aula.id}/inviti`, {
        method: 'POST',
        headers: comeUtente(capo.token),
        payload: { destinatario: doppioTitolo.indirizzo },
      });
      await chiedi(`/inviti/${invitoAula.json().data.id}/accettazione`, {
        method: 'POST',
        headers: comeUtente(doppioTitolo.token),
      });
      await recapitoAula.eseguiGiro();
      expect(
        await partecipanteNellaSala(capo.token, aula.id, doppioTitolo.utenteId),
      ).toBeDefined();

      await chiedi(`/gruppi/${gruppo.id}/membri/${doppioTitolo.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(capo.token),
      });
      await recapito.eseguiGiro();

      // Perdere l'appartenenza non toglie un titolo che non veniva da lì.
      expect(
        await partecipanteNellaSala(capo.token, aula.id, doppioTitolo.utenteId),
      ).toBeDefined();
    });

    it('chi esce da solo dal gruppo esce anche dall\'aula collocata', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);
      const membro = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, membro);
      await entraInAula(membro.token, aula.id);

      await chiedi(`/gruppi/${gruppo.id}/membri/${membro.utenteId}`, {
        method: 'DELETE',
        headers: comeUtente(membro.token),
      });
      await recapito.eseguiGiro();

      expect(await partecipanteNellaSala(capo.token, aula.id, membro.utenteId)).toBeUndefined();
    });
  });

  describe('eliminare il gruppo', () => {
    it('non elimina alcuna aula: le aule collocate tornano sciolte', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const aula = await creaAula(capo.token, gruppo.id);

      const eliminazione = await chiedi(`/gruppi/${gruppo.id}`, {
        method: 'DELETE',
        headers: comeUtente(capo.token),
      });
      expect(eliminazione.statusCode).toBe(200);
      await recapito.eseguiGiro();

      // L'aula è viva, con i suoi materiali e la sua storia: riorganizzare non
      // distrugge. Ha solo perso la collocazione.
      const sala = await chiedi(`/aule-studio/${aula.id}/sala`, { headers: comeUtente(capo.token) });
      expect(sala.statusCode).toBe(200);
      expect(sala.json().data.aula.gruppoId).toBeNull();
    });

    it('solo un moderatore elimina il gruppo', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token);
      const semplice = await utenteCompleto();
      await aggiungiAlGruppo(capo, gruppo.id, semplice);

      const risposta = await chiedi(`/gruppi/${gruppo.id}`, {
        method: 'DELETE',
        headers: comeUtente(semplice.token),
      });

      expect(risposta.statusCode).toBe(403);
    });
  });

  describe('elenco e lettura', () => {
    it('l\'elenco porta i gruppi di cui si è membri, non gli altri', async () => {
      const io = await utenteCompleto();
      const mio = await creaGruppo(io.token, { nome: 'Il mio gruppo' });
      const altri = await utenteCompleto();
      await creaGruppo(altri.token, { nome: 'Gruppo di altri' });

      const risposta = await chiedi('/gruppi', { headers: comeUtente(io.token) });

      expect(risposta.statusCode).toBe(200);
      const ids = risposta.json().data.map((g: { id: string }) => g.id);
      expect(ids).toContain(mio.id);
      expect(ids).toHaveLength(1);
    });

    it('un gruppo pubblico si legge anche da chi non ne fa parte, che però non è membro', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token, { visibilita: 'PUBBLICO' });
      const estraneo = await utenteCompleto();

      const risposta = await dettaglio(estraneo.token, gruppo.id);

      expect(risposta.statusCode).toBe(200);
      expect(risposta.json().data.gruppo.sonoMembro).toBe(false);
      expect(risposta.json().data.gruppo.sonoModeratore).toBe(false);
    });

    it('senza sessione non si legge nulla', async () => {
      const capo = await utenteCompleto();
      const gruppo = await creaGruppo(capo.token, { visibilita: 'PUBBLICO' });

      const risposta = await chiedi(`/gruppi/${gruppo.id}`);

      expect(risposta.statusCode).toBe(401);
      expect(risposta.json().errorCode).toBe('PR006');
    });
  });
});
