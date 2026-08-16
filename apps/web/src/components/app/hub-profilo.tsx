'use client';

import { useTranslations } from 'next-intl';
import { useElencaMieiGruppi, useLeggiMioProfilo } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import {
  SEGNAPOSTO_AULE_CREATE,
  SEGNAPOSTO_MATERIALI_SALVATI,
  SEGNAPOSTO_POST_MIEI,
  type Segnaposto,
} from '@/lib/segnaposto';
import { Avatar, Card, Chip, Icona, type NomeIcona } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { cn } from '@/lib/utils';

const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

/** Un numero che non c'è non è zero: è un numero che non sappiamo. */
const IGNOTO = '—';

interface Tessera {
  chiave: string;
  etichetta: string;
  icona: NomeIcona;
  tinta: 'menta' | 'ambra' | 'blu' | 'neutra';
  valore?: number;
  presto?: Segnaposto;
}

const SFONDO: Record<Tessera['tinta'], string> = {
  menta: 'bg-tinta-menta text-tinta-menta-testo',
  ambra: 'bg-tinta-ambra text-tinta-ambra-testo',
  blu: 'bg-tinta-blu text-tinta-blu-testo',
  neutra: 'bg-tinta-neutra text-tinta-neutra-testo',
};

/**
 * Il proprio profilo: chi sei e cosa hai prodotto.
 *
 * È una destinazione diversa dalle impostazioni, e sul web la separazione è
 * più netta che sul telefono perché hanno due indirizzi: `/app/profilo` è una
 * pagina di contenuto, `/app/impostazioni` una pagina di controllo. Fino a
 * ieri la voce «Profilo» della colonna di navigazione portava alle
 * impostazioni, che è come chiamare «casa» il quadro elettrico.
 *
 * **Le quattro tessere sono la forma del disegno, non i suoi numeri.** L'unico
 * conteggio vero è quello dei gruppi, perché «i miei gruppi» è una domanda che
 * il server sa già rispondere; post, aule e materiali mostrano un trattino,
 * perché per contarli servirebbe un filtro per autore che gli elenchi non
 * hanno. Non si contano nemmeno passando dall'esportazione dei dati: quello è
 * l'adempimento GDPR, e usarlo per decorare tre riquadri sarebbe un abuso di
 * un endpoint che esiste per un'altra ragione.
 *
 * Sotto le tessere il disegno prevede le schede dei propri contenuti. C'è solo
 * quella dei gruppi, per la stessa ragione: le altre tre non hanno una
 * domanda da fare.
 *
 * SEGNAPOSTO: post, aule create, materiali salvati e il profilo pubblico.
 */
export function HubProfilo() {
  const t = useTranslations('app.profilo');
  const tImpostazioni = useTranslations('app.impostazioni');
  const tNav = useTranslations('app.nav');
  const tComune = useTranslations('comune');
  const profilo = useLeggiMioProfilo();
  const gruppi = useElencaMieiGruppi({ limit: 12 });

  const totaleGruppi = gruppi.data?.meta.pagination.total;

  const tessere: readonly Tessera[] = [
    {
      chiave: 'post',
      etichetta: t('tuoiPost'),
      icona: 'bacheca',
      tinta: 'menta',
      presto: SEGNAPOSTO_POST_MIEI,
    },
    {
      chiave: 'aule',
      etichetta: t('auleCreate'),
      icona: 'aule',
      tinta: 'ambra',
      presto: SEGNAPOSTO_AULE_CREATE,
    },
    {
      chiave: 'materiali',
      etichetta: tNav('materiali'),
      icona: 'cartella',
      tinta: 'blu',
      presto: SEGNAPOSTO_MATERIALI_SALVATI,
    },
    {
      chiave: 'gruppi',
      etichetta: tNav('tuoiGruppi'),
      icona: 'gruppi',
      tinta: 'neutra',
      valore: totaleGruppi,
    },
  ];

  return (
    <>
      <QueryBoundary query={profilo}>
        {({ data }) => {
          const nome = [data.nome, data.cognome].filter(Boolean).join(' ');
          const studi = [data.universita?.nome, data.corso?.nome].filter(Boolean).join(' · ');

          return (
            <Card padding="md" className="mb-6 flex flex-wrap items-center gap-5">
              <Avatar nome={nome || '?'} dimensione={84} className="text-3xl" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-testo">
                  {nome || tImpostazioni('senzaNome')}
                </p>
                {studi ? (
                  <p className="mt-1 text-[14.5px] text-testo-tenue">{studi}</p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {/* La pastiglia dice la visibilità vera, quella che il server
                      ha confermato: è l'unica cosa che questa pagina sa dire
                      su «cosa vedono gli altri». */}
                  <Chip tono="menta" dimensione="sm">
                    {tImpostazioni(`visibilita.${CHIAVI[data.impostazioniPrivacy.visibilita]}`)}
                  </Chip>
                </div>
              </div>
            </Card>
          );
        }}
      </QueryBoundary>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tessere.map((tessera) => (
          <Card
            key={tessera.chiave}
            padding="md"
            className={cn('rounded-2xl', tessera.presto && 'opacity-60')}
          >
            <span
              aria-hidden
              className={cn(
                'mb-2.5 grid size-9 place-items-center rounded-xl',
                SFONDO[tessera.tinta],
              )}
            >
              <Icona nome={tessera.icona} dimensione={19} />
            </span>
            <p className="font-display text-[26px] font-extrabold leading-none text-testo">
              {tessera.presto || tessera.valore === undefined ? IGNOTO : tessera.valore}
            </p>
            <p className="mt-1.5 text-[12.5px] font-bold text-testo-tenue">{tessera.etichetta}</p>
            {tessera.presto ? (
              <Chip tono="ambra" dimensione="sm" className="mt-2">
                {tComune('presto')}
              </Chip>
            ) : null}
          </Card>
        ))}
      </div>

      <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
        {tNav('tuoiGruppi')}
      </p>
      <QueryBoundary
        query={gruppi}
        eVuoto={(risposta) => risposta.data.length === 0}
        vuoto={
          <Card variante="tenue" padding="md">
            <p className="text-[13px] text-testo-tenue">{t('nessunGruppo')}</p>
          </Card>
        }
      >
        {(risposta) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {risposta.data.map((gruppo) => (
              <Card
                key={gruppo.id}
                come={Link}
                href={percorsiApp.gruppo(gruppo.id)}
                padding="md"
                className="flex items-center gap-3 transition-colors hover:border-tinta-menta-bordo"
              >
                <span
                  aria-hidden
                  className="size-9 flex-none rounded-xl bg-gradient-to-br from-primary-200 to-primary-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-extrabold text-testo">
                    {gruppo.nome}
                  </span>
                </span>
                <Icona nome="avanti" dimensione={18} className="flex-none text-testo-debole" />
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
