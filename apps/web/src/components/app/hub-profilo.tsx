'use client';

import { useTranslations } from 'next-intl';
import {
  useElencaAuleStudio,
  useElencaMaterialiSalvati,
  useElencaMieiGruppi,
  useElencaPost,
  useLeggiMioProfilo,
} from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
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
  /** Dove porta: una tessera che non porta da nessuna parte è un numero e basta. */
  href: string;
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
 * **I quattro numeri sono veri**, e vengono dalla paginazione delle quattro
 * letture che il server sa già fare: i miei gruppi, le mie aule, i miei post
 * (la bacheca con `soloMiei=true`) e la raccolta dei materiali salvati. Si
 * chiede **una riga sola** per ciascuno: serve il totale, non l'elenco. Il
 * trattino resta per il tempo in cui il numero non è ancora arrivato, perché
 * un numero che non c'è non è zero.
 *
 * Ogni tessera porta alla propria pagina: erano quattro riquadri di cui tre
 * spenti con la pastiglia «presto», cioè la forma del disegno senza niente
 * dietro.
 */
export function HubProfilo() {
  const t = useTranslations('app.profilo');
  const tImpostazioni = useTranslations('app.impostazioni');
  const tNav = useTranslations('app.nav');
  const profilo = useLeggiMioProfilo();
  const gruppi = useElencaMieiGruppi({ limit: 12 });
  // Una riga sola: di queste tre serve il totale, non il contenuto.
  const mieiPost = useElencaPost({ limit: 1, soloMiei: true });
  const mieAule = useElencaAuleStudio({ limit: 1 });
  const salvati = useElencaMaterialiSalvati({ limit: 1 });

  const totaleGruppi = gruppi.data?.meta.pagination.total;
  const totalePost = mieiPost.data?.meta.pagination.total;
  const totaleAule = mieAule.data?.meta.pagination.total;
  const totaleSalvati = salvati.data?.meta.pagination.total;

  const tessere: readonly Tessera[] = [
    {
      chiave: 'post',
      etichetta: t('tuoiPost'),
      icona: 'bacheca',
      tinta: 'menta',
      valore: totalePost,
      href: percorsiApp.mieiPost(),
    },
    {
      chiave: 'aule',
      etichetta: t('tueAule'),
      icona: 'aule',
      tinta: 'ambra',
      valore: totaleAule,
      href: percorsiApp.mieAule(),
    },
    {
      chiave: 'materiali',
      etichetta: tNav('materiali'),
      icona: 'cartella',
      tinta: 'blu',
      valore: totaleSalvati,
      href: percorsiApp.materialiSalvati(),
    },
    {
      chiave: 'gruppi',
      etichetta: tNav('tuoiGruppi'),
      icona: 'gruppi',
      tinta: 'neutra',
      valore: totaleGruppi,
      href: percorsiApp.gruppi(),
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
                {/* La pastiglia porta la sua etichetta e non sta nuda accanto
                    al nome: da sola, «Privato» si leggerebbe come «questo
                    profilo è privato», e «Pubblico» come «questo profilo è sul
                    web» — che è falso e resterà falso. Quella scelta riguarda
                    **quello che scrivi**, e vale dentro Prome. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold text-testo-debole">
                    {tImpostazioni('contenuti.titolo')}
                  </span>
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
            come={Link}
            href={tessera.href}
            padding="md"
            className="rounded-2xl transition-colors hover:border-tinta-menta-bordo"
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
              {tessera.valore === undefined ? IGNOTO : tessera.valore}
            </p>
            <p className="mt-1.5 text-[12.5px] font-bold text-testo-tenue">{tessera.etichetta}</p>
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
