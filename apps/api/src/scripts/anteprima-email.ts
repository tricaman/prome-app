import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { registrazioneI18n } from '../config/i18n';
import { CanaleEmailSmtp } from '../infrastruttura/avvisi-in-uscita/canale-email-smtp';
import { CID_LOGO, logoPng } from '../infrastruttura/avvisi-in-uscita/modello-email';

/**
 * Scrive su disco ogni email transazionale, in ogni lingua, per guardarle.
 *
 * Un'email si controlla solo aprendola, e finché l'unico modo di vederne una
 * era chiedere davvero un codice di accesso, nessuno la apriva: si guardava il
 * codice sorgente e si sperava. Questo script toglie la scusa —
 * `pnpm --filter @prome/api email:anteprima`, poi si aprono i file nel browser
 * e nei due temi di sistema.
 *
 * **Passa dall'adattatore vero**, non da una copia dei testi: le anteprime
 * sono esattamente ciò che partirebbe, i18n compresa. Un'anteprima costruita a
 * parte è un'anteprima che prima o poi mente.
 */

/** Contesto minimo: solo le traduzioni. Niente database, niente HTTP. */
@Module({ imports: [registrazioneI18n] })
class ContestoTraduzioni {}

/** Le lingue del prodotto: un'email va guardata in tutte e due. */
const LINGUE = ['it', 'en'] as const;

const DESTINAZIONE = path.resolve(process.cwd(), '.anteprima-email');

/**
 * Nel browser `cid:` non risolve niente: solo per l'anteprima il marchio
 * diventa un indirizzo dati. Nella posta vera resta l'allegato in linea.
 */
function marchioVisibileNelBrowser(html: string): string {
  const dati = logoPng().toString('base64');
  return html.replaceAll(`cid:${CID_LOGO}`, `data:image/png;base64,${dati}`);
}

async function genera(): Promise<void> {
  const contesto = await NestFactory.createApplicationContext(ContestoTraduzioni, {
    logger: false,
  });
  const i18n = contesto.get(I18nService);
  const canale = new CanaleEmailSmtp(i18n);

  // Il trasporto non deve spedire niente: si sostituisce con uno che raccoglie.
  const raccolti: { nome: string; oggetto: string; html: string; testo: string }[] = [];
  let nomeCorrente = '';
  (canale as unknown as { trasporto: { sendMail: (m: Record<string, string>) => Promise<void> } }
  ).trasporto = {
    sendMail: (messaggio) => {
      raccolti.push({
        nome: nomeCorrente,
        oggetto: messaggio.subject,
        html: messaggio.html,
        testo: messaggio.text,
      });
      return Promise.resolve();
    },
  };

  const scadenza = new Date('2026-08-22T10:00:00Z');
  for (const lingua of LINGUE) {
    nomeCorrente = `codice-accesso.${lingua}`;
    await canale.inviaCodiceAccesso('anteprima@prome.app', '481902', lingua);

    nomeCorrente = `invito-aula-studio.${lingua}`;
    await canale.inviaInvitoAulaStudio(
      'anteprima@prome.app',
      {
        titoloAula: 'Analisi 1 — preparazione appello',
        invitatoDa: 'Marta',
        collegamento: 'https://prome.app/app/inviti/anteprima',
        scadeIl: scadenza,
      },
      lingua,
    );
  }

  fs.rmSync(DESTINAZIONE, { recursive: true, force: true });
  fs.mkdirSync(DESTINAZIONE, { recursive: true });

  for (const email of raccolti) {
    fs.writeFileSync(
      path.join(DESTINAZIONE, `${email.nome}.html`),
      marchioVisibileNelBrowser(email.html),
    );
    // Anche la parte in testo semplice va guardata: è ciò che vede chi ha
    // l'HTML spento, ed è la metà che nessuno controlla mai.
    fs.writeFileSync(
      path.join(DESTINAZIONE, `${email.nome}.txt`),
      `Oggetto: ${email.oggetto}\n\n${email.testo}\n`,
    );
  }

  await contesto.close();

  console.log(`Anteprime scritte in ${DESTINAZIONE}:`);
  for (const email of raccolti) {
    console.log(`  - ${email.nome} — «${email.oggetto}»`);
  }
  console.log('Aprile nel browser, poi ripetile con il tema di sistema scuro.');
}

genera().catch((errore) => {
  console.error(errore);
  process.exit(1);
});
