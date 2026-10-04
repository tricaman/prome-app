/**
 * Builds the academic catalog from the Ministry (MUR) open data.
 *
 * Source: the "metadati" dataset of https://dati-ustat.mur.gov.it, two files:
 *   - 01_atenei.csv                              (universities)
 *   - 03_offertaformativa-corsidilaurea_*.csv     (degree courses, by year)
 *
 * Usage, once a year when MUR publishes the new offering:
 *   pnpm --filter @prome/api catalogo:importa <atenei.csv> <offerta.csv> [anno]
 *
 * It writes `modules/profilo/catalogo/dati/catalogo-mur.json`, which is
 * versioned: the seed reads it at every release, and the yearly diff shows
 * which courses appeared and which went away (the seed retires the latter).
 *
 * Imports only Node built-ins, so Node runs it directly (type stripping).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Livello = 'TRIENNALE' | 'MAGISTRALE' | 'CICLO_UNICO';

interface Classe {
  codice: string;
  nome: string;
  livello: Livello;
}

interface Corso {
  codice: string;
  nome: string;
  classeCodice: string;
  durataAnni: number;
}

interface Universita {
  slug: string;
  nome: string;
  nomeBreve: string;
  citta: string;
  corsi: Corso[];
}

// Resolved from the working directory (apps/api, where the pnpm script runs):
// `__dirname` does not exist when Node runs this file as an ES module.
const USCITA = join(process.cwd(), 'src/modules/profilo/catalogo/dati/catalogo-mur.json');

/**
 * Universities that already had a public page and a catalog row before the
 * import: same slug (the page URL), same names. Keyed by MUR university code.
 */
const ANAGRAFICA_ESISTENTE: Record<string, Omit<Universita, 'corsi' | 'citta'>> = {
  '01701': { slug: 'universita-di-brescia', nome: 'Università degli Studi di Brescia', nomeBreve: 'UniBS' },
  '03701': { slug: 'universita-di-bologna', nome: 'Università di Bologna', nomeBreve: 'UniBo' },
  '05801': { slug: 'sapienza-roma', nome: 'Sapienza Università di Roma', nomeBreve: 'Sapienza' },
  '01502': { slug: 'politecnico-di-milano', nome: 'Politecnico di Milano', nomeBreve: 'PoliMi' },
  '02801': { slug: 'universita-di-padova', nome: 'Università di Padova', nomeBreve: 'Padova' },
  '06301': { slug: 'federico-ii-napoli', nome: 'Università di Napoli Federico II', nomeBreve: 'Federico II' },
};

const LIVELLI: Record<string, Livello> = {
  Laurea: 'TRIENNALE',
  'Laurea Magistrale': 'MAGISTRALE',
  'Laurea Magistrale Ciclo Unico': 'CICLO_UNICO',
};

/** Single-cycle classes that last six years; every other single cycle lasts five. */
const CICLO_UNICO_SEI_ANNI = new Set(['LM-41', 'LM-46']);

/** Semicolon-separated values with optional double quotes (RFC 4180 style). */
function leggiCsv(testo: string): Record<string, string>[] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = '';
  let traVirgolette = false;

  for (let i = 0; i < testo.length; i += 1) {
    const carattere = testo[i];

    if (traVirgolette) {
      if (carattere === '"' && testo[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else if (carattere === '"') {
        traVirgolette = false;
      } else {
        campo += carattere;
      }
    } else if (carattere === '"') {
      traVirgolette = true;
    } else if (carattere === ';') {
      riga.push(campo);
      campo = '';
    } else if (carattere === '\n') {
      riga.push(campo.replace(/\r$/, ''));
      righe.push(riga);
      riga = [];
      campo = '';
    } else {
      campo += carattere;
    }
  }

  if (campo || riga.length) {
    riga.push(campo);
    righe.push(riga);
  }

  const [intestazione, ...dati] = righe.filter((r) => r.some((valore) => valore.trim()));

  return dati.map((valori) => Object.fromEntries(intestazione.map((nome, k) => [nome.trim(), (valori[k] ?? '').trim()])));
}

/** A URL- and code-safe form of a name. */
function slug(testo: string): string {
  return testo
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

/** Names written all in capitals become sentence case; mixed-case names stay as written. */
function nomeLeggibile(testo: string): string {
  const pulito = testo.replaceAll(/\s+/g, ' ').trim();

  if (pulito !== pulito.toUpperCase()) {
    return pulito;
  }

  const minuscolo = pulito.toLowerCase();

  return minuscolo.charAt(0).toUpperCase() + minuscolo.slice(1);
}

/** Linking words that stay lowercase inside a place name. */
const PAROLE_MINUSCOLE = new Set(['di', 'del', 'della', 'dei', 'delle', 'sul', 'sulla', 'in', 'e']);

/** "TORINO" -> "Torino", "DESENZANO DEL GARDA" -> "Desenzano del Garda". */
function nomeDiLuogo(testo: string): string {
  return testo
    .toLowerCase()
    .split(' ')
    .map((parola, indice) =>
      indice > 0 && PAROLE_MINUSCOLE.has(parola)
        ? parola
        : parola.replaceAll(/(^|['-])(\p{L})/gu, (_tutto, prima: string, lettera: string) => prima + lettera.toUpperCase()),
    )
    .join(' ');
}

/**
 * The course name without what only repeats it: the campus copy marker
 * ("<name> REPLICA <PLACE>") and, on health degrees, "(abilitante alla
 * professione sanitaria di <profession>)", which restates the course name.
 */
function nomeBase(nome: string): string {
  return nome
    .replace(/\s+REPLICA\b.*$/i, '')
    .replace(/\s*\(abilitante alla professione sanitaria di [^)]*\)/i, '')
    .trim();
}

const chiaveAteneo = (nome: string) => nome.replaceAll(/\s+/g, '').toLowerCase();

function importa(percorsoAtenei: string, percorsoOfferta: string, annoRichiesto?: string): void {
  const atenei = leggiCsv(readFileSync(percorsoAtenei, 'utf8').replace(/^﻿/, ''));
  // MUR publishes the offering in Windows-1252, not UTF-8.
  const offerta = leggiCsv(new TextDecoder('windows-1252').decode(readFileSync(percorsoOfferta)));

  const anno = annoRichiesto ?? String(Math.max(...offerta.map((riga) => Number(riga.ANNO))));
  const corsiDellAnno = offerta.filter((riga) => riga.ANNO === anno);
  const ateneoPerNome = new Map(atenei.map((ateneo) => [chiaveAteneo(ateneo.NomeOperativo), ateneo]));

  const classi = new Map<string, Classe>();
  const perAteneo = new Map<string, Record<string, string>[]>();

  for (const riga of corsiDellAnno) {
    const livello = LIVELLI[riga.TipoCorso];

    if (!livello) {
      throw new Error(`Tipo di corso sconosciuto: "${riga.TipoCorso}" (${riga.Corso}).`);
    }

    if (!classi.has(riga.Classe)) {
      classi.set(riga.Classe, { codice: riga.Classe, nome: riga.NomeClasse, livello });
    }

    const elenco = perAteneo.get(riga.Ateneo) ?? [];
    elenco.push(riga);
    perAteneo.set(riga.Ateneo, elenco);
  }

  const universita: Universita[] = [];

  for (const [nomeOperativo, righe] of perAteneo) {
    const ateneo = ateneoPerNome.get(chiaveAteneo(nomeOperativo));

    if (!ateneo) {
      throw new Error(`Ateneo dell'offerta assente dall'elenco degli atenei: "${nomeOperativo}".`);
    }

    // A base name taught at more than one campus carries the campus in the
    // name, on every campus: students at different campuses are in
    // different classrooms, and the picker must tell them apart.
    const campusPerNome = new Map<string, Set<string>>();

    for (const riga of righe) {
      const base = nomeLeggibile(nomeBase(riga.Corso)).toLowerCase();
      const campus = campusPerNome.get(base) ?? new Set<string>();
      campus.add(riga.SedeCorso_Comune);
      campusPerNome.set(base, campus);
    }

    const corsi = new Map<string, Corso>();

    for (const riga of righe) {
      const base = nomeLeggibile(nomeBase(riga.Corso));
      const comune = nomeDiLuogo(riga.SedeCorso_Comune);
      const piuCampus = campusPerNome.get(base.toLowerCase())!.size > 1;
      // Stable from year to year while MUR keeps class, name and campus.
      const codice = `${riga.Classe}:${slug(base)}:${slug(comune)}`;

      corsi.set(codice, {
        codice,
        nome: piuCampus ? `${base} (${comune})` : base,
        classeCodice: riga.Classe,
        durataAnni:
          LIVELLI[riga.TipoCorso] === 'TRIENNALE'
            ? 3
            : LIVELLI[riga.TipoCorso] === 'MAGISTRALE'
              ? 2
              : CICLO_UNICO_SEI_ANNI.has(riga.Classe)
                ? 6
                : 5,
      });
    }

    const esistente = ANAGRAFICA_ESISTENTE[ateneo.COD_Ateneo];

    universita.push({
      slug: esistente?.slug ?? slug(ateneo.NomeEsteso),
      nome: esistente?.nome ?? ateneo.NomeEsteso,
      nomeBreve: esistente?.nomeBreve ?? ateneo.NomeOperativo.replaceAll(/\s+/g, ' '),
      citta: nomeDiLuogo(ateneo.CITTA || ateneo.PROVINCIA),
      corsi: [...corsi.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it') || a.codice.localeCompare(b.codice)),
    });
  }

  universita.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  const catalogo = {
    fonte: 'MUR, dati-ustat.mur.gov.it, dataset "metadati" (atenei, offerta formativa)',
    // Reuse is allowed with attribution to the source.
    licenza: 'Italian Open Data License v2.0 (IODL 2.0)',
    anno: Number(anno),
    classi: [...classi.values()].sort((a, b) => a.codice.localeCompare(b.codice, 'it', { numeric: true })),
    universita,
  };

  writeFileSync(USCITA, `${JSON.stringify(catalogo, null, 2)}\n`);

  const totaleCorsi = universita.reduce((somma, voce) => somma + voce.corsi.length, 0);

  console.log(`Anno ${anno}: ${universita.length} atenei, ${classi.size} classi, ${totaleCorsi} corsi -> ${USCITA}`);
}

const [percorsoAtenei, percorsoOfferta, anno] = process.argv.slice(2);

if (!percorsoAtenei || !percorsoOfferta) {
  throw new Error('Uso: node src/scripts/importa-catalogo-mur.ts <atenei.csv> <offerta.csv> [anno]');
}

importa(percorsoAtenei, percorsoOfferta, anno);
