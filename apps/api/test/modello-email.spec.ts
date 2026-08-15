import {
  azione,
  codice,
  componiEmail,
  dettagli,
  nota,
  paragrafo,
  separatore,
  titolo,
  CID_LOGO,
  type ContenutoEmail,
  type TestiInvolucro,
} from '../src/infrastruttura/avvisi-in-uscita/modello-email';
import {
  indirizzoSicuro,
  intestazioneSicura,
} from '../src/infrastruttura/avvisi-in-uscita/modello-email/sicurezza';

/**
 * Il modello delle email.
 *
 * Sono funzioni pure e non serve un database: si prova ciò che nessuno può
 * verificare a occhio dopo la spedizione — che l'involucro sia lo stesso per
 * tutti, che il testo di chi scrive non diventi HTML, e che la parte in testo
 * semplice dica le stesse cose di quella HTML. Sono i tre modi in cui un
 * sistema di email si guasta senza che nessuno se ne accorga.
 */

const TESTI: TestiInvolucro = {
  marchio: 'Prome',
  piedeMarchio: 'Prome · prome.app',
  piedeNota: 'Messaggio automatico: non rispondere a questo indirizzo.',
};

const CODICE: ContenutoEmail = {
  oggetto: '123456 è il tuo codice per entrare in Prome',
  anteprima: 'Il codice vale 10 minuti.',
  blocchi: [
    titolo('Il tuo codice di accesso'),
    codice('123456'),
    paragrafo('Inseriscilo in Prome entro 10 minuti.'),
    separatore(),
    nota('Se non hai chiesto tu di entrare, ignora questo messaggio.'),
  ],
};

const INVITO: ContenutoEmail = {
  oggetto: 'Marta ti invita in aula studio su Prome',
  anteprima: 'Apri l’invito per entrare in «Analisi 1».',
  blocchi: [
    titolo('Sei stato invitato in un’aula studio'),
    paragrafo('Marta ti ha invitato in «Analisi 1».'),
    dettagli([
      { etichetta: 'Aula studio', valore: 'Analisi 1' },
      { etichetta: 'Invitato da', valore: 'Marta' },
    ]),
    azione('Entra nell’aula', 'https://prome.app/app/inviti/abc'),
    nota('L’invito vale fino al 22 agosto.'),
  ],
};

describe('Modello email — l’involucro è uno solo', () => {
  const a = componiEmail(CODICE, 'it', TESTI);
  const b = componiEmail(INVITO, 'it', TESTI);

  it('mette lo stesso marchio, lo stesso piè di pagina e la stessa larghezza in ogni messaggio', () => {
    for (const email of [a, b]) {
      expect(email.html).toContain(`cid:${CID_LOGO}`);
      expect(email.html).toContain('Prome · prome.app');
      expect(email.html).toContain('Messaggio automatico: non rispondere a questo indirizzo.');
      expect(email.html).toContain('max-width:520px');
    }
  });

  it('allega il marchio in linea, così si vede anche con le immagini bloccate', () => {
    expect(a.allegati).toHaveLength(1);
    const marchio = a.allegati[0]!;
    expect(marchio.cid).toBe(CID_LOGO);
    expect(marchio.contentDisposition).toBe('inline');
    expect(marchio.contentType).toBe('image/png');
    // Un PNG comincia sempre con questa firma: se il file copiato in `dist`
    // fosse un altro, o mancasse, il test se ne accorge qui.
    expect(marchio.content.subarray(1, 4).toString('ascii')).toBe('PNG');
  });

  it('impagina con tabelle e stili in linea, come la posta richiede', () => {
    expect(a.html).toContain('<table role="presentation"');
    // Nessun foglio esterno e nessuna variabile CSS: Gmail scarta i primi,
    // Outlook non conosce le seconde.
    expect(a.html).not.toContain('<link');
    expect(a.html).not.toContain('var(--');
  });

  it('dichiara il tema scuro per ogni classe che usa', () => {
    const classiUsate = [...a.html.matchAll(/class="(e-[a-z]+)"/g)].map((trovato) => trovato[1]!);
    const foglio = a.html.slice(a.html.indexOf('<style>'), a.html.indexOf('</style>'));
    for (const classe of new Set(classiUsate)) {
      expect(foglio).toContain(`.${classe}`);
    }
  });
});

describe('Modello email — ciò che scrive un utente non diventa HTML', () => {
  it('neutralizza i marcatori nel titolo di un’aula studio', () => {
    const email = componiEmail(
      {
        oggetto: 'invito',
        anteprima: 'invito',
        blocchi: [paragrafo('Aula «<script>alert(1)</script>» di "Marta" & altri')],
      },
      'it',
      TESTI,
    );

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('&quot;Marta&quot;');
    expect(email.html).toContain('&amp; altri');
  });

  it('non lascia passare un indirizzo che non sia http, https o mailto', () => {
    expect(indirizzoSicuro('https://prome.app/x')).toBe('https://prome.app/x');
    expect(indirizzoSicuro('javascript:alert(1)')).toBe('#');
    expect(indirizzoSicuro('data:text/html;base64,PHNjcmlwdD4=')).toBe('#');
  });

  it('toglie dall’oggetto i caratteri con cui si aggiungerebbe un’intestazione', () => {
    const conACapo = ['Analisi 1', 'Bcc: vittima@esempio.it'].join('\r\n');
    expect(intestazioneSicura(conACapo)).toBe('Analisi 1 Bcc: vittima@esempio.it');
    // I trattini e gli spazi normali restano: si tolgono i caratteri di
    // controllo, non la punteggiatura.
    expect(intestazioneSicura('Analisi 1 — gruppo A')).toBe('Analisi 1 — gruppo A');
  });

  it('ripulisce l’oggetto anche quando arriva dal contenuto', () => {
    const email = componiEmail(
      { oggetto: 'Invito\r\nBcc: altro@esempio.it', anteprima: 'x', blocchi: [] },
      'it',
      TESTI,
    );
    expect(email.oggetto).toBe('Invito Bcc: altro@esempio.it');
  });
});

describe('Modello email — testo semplice e HTML dicono le stesse cose', () => {
  it('porta in entrambe le versioni ogni testo dichiarato nei blocchi', () => {
    const email = componiEmail(INVITO, 'it', TESTI);
    const attesi = [
      'Sei stato invitato in un’aula studio',
      'Marta ti ha invitato in «Analisi 1».',
      'Aula studio',
      'Invitato da',
      'Entra nell’aula',
      'L’invito vale fino al 22 agosto.',
      'Prome · prome.app',
    ];

    for (const atteso of attesi) {
      expect(email.testo).toContain(atteso);
      // Nell'HTML le virgolette tipografiche restano tali: si sfuggono solo i
      // marcatori, quindi il confronto è diretto.
      expect(email.html).toContain(atteso);
    }
  });

  it('mette l’indirizzo per esteso nel testo semplice, dove non c’è nulla da premere', () => {
    const email = componiEmail(INVITO, 'it', TESTI);
    expect(email.testo).toContain('https://prome.app/app/inviti/abc');
  });

  it('non lascia il codice dentro una frase', () => {
    const email = componiEmail(CODICE, 'it', TESTI);
    expect(email.testo).toContain('\n\n123456\n\n');
  });

  it('non manda mai un HTML senza la sua parte in testo semplice', () => {
    for (const contenuto of [CODICE, INVITO]) {
      const email = componiEmail(contenuto, 'it', TESTI);
      expect(email.testo.trim().length).toBeGreaterThan(0);
      expect(email.html.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Modello email — la lingua è quella della richiesta', () => {
  it('dichiara la lingua nel documento, per chi legge con una sintesi vocale', () => {
    expect(componiEmail(CODICE, 'en', TESTI).html).toContain('<html lang="en"');
    expect(componiEmail(CODICE, 'it', TESTI).html).toContain('<html lang="it"');
  });
});
