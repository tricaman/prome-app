'use client';

import { useTranslations } from 'next-intl';
import { useLeggiPreferenzeNotifiche, useLeggiMioProfilo } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { percorsi } from '@/content';
import { Link, usePathname } from '@/i18n/navigazione';
import {
  SEGNAPOSTO_DISPOSITIVI,
  SEGNAPOSTO_EMAIL,
  type Segnaposto,
} from '@/lib/segnaposto';
import { Elenco, RigaElenco, type NomeIcona, type RigaElencoProps } from '@/components/ui';

const CHIAVI = { PRIVATO: 'privato', ATENEO: 'ateneo', PUBBLICO: 'pubblico' } as const;

interface Voce {
  chiave: string;
  etichetta: string;
  sottotitolo?: string;
  valore?: string;
  icona: NomeIcona;
  tinta?: RigaElencoProps['tinta'];
  href?: string;
  /** Documento del sito: esce dall'area privata, quindi lo si dichiara. */
  esterno?: string;
  distruttiva?: boolean;
  presto?: Segnaposto;
}

/**
 * L'indice delle impostazioni.
 *
 * Prima era una colonna di ancore verso cinque sezioni di una pagina sola,
 * dove tutti i controlli stavano aperti insieme — scelte di privacy,
 * interruttori, azioni distruttive nella stessa scorsa. Ora ogni sezione ha il
 * proprio indirizzo e il proprio pannello: su un computer si arriva qui con un
 * obiettivo preciso, e deve bastare un colpo d'occhio.
 *
 * **Ogni riga porta a destra il valore corrente.** È ciò che rende un indice
 * migliore di una lista di controlli: quasi sempre chi apre le impostazioni
 * vuole verificare, non cambiare, e se il valore si legge qui non apre niente.
 * Il valore è quello che il server ha confermato, mai una previsione.
 *
 * SEGNAPOSTO: «Email e password» e «Dispositivi collegati». Il profilo non
 * espone l'email di proposito e l'accesso è a codice, quindi non c'è nemmeno
 * una password; i dispositivi si registrano ma non esiste un `GET` che li
 * elenchi.
 */
export function NavImpostazioni() {
  const t = useTranslations('app.impostazioni');
  const tComune = useTranslations('comune');
  const percorso = usePathname();
  const profilo = useLeggiMioProfilo();
  const preferenze = useLeggiPreferenzeNotifiche();

  const visibilita = profilo.data?.data.impostazioniPrivacy.visibilita;
  const accesi = preferenze.data
    ? Number(preferenze.data.data.commenti) + Number(preferenze.data.data.inviti)
    : undefined;

  const riassuntoAvvisi =
    accesi === undefined
      ? undefined
      : accesi === 0
        ? t('nessunaAttiva')
        : accesi === 1
          ? t('unaAttiva')
          : t('attive', { numero: String(accesi) });

  const gruppi: readonly { titolo: string; voci: readonly Voce[] }[] = [
    {
      titolo: t('gruppi.account'),
      voci: [
        {
          chiave: 'modifica',
          etichetta: t('voci.profilo'),
          sottotitolo: t('voci.profiloSub'),
          icona: 'matita',
          tinta: 'menta',
          href: percorsiApp.modificaProfilo(),
        },
        {
          chiave: 'email',
          etichetta: t('voci.email'),
          sottotitolo: t('voci.emailSub'),
          icona: 'posta',
          presto: SEGNAPOSTO_EMAIL,
        },
        {
          chiave: 'dispositivi',
          etichetta: t('voci.dispositivi'),
          sottotitolo: t('voci.dispositiviSub'),
          icona: 'dispositivo',
          presto: SEGNAPOSTO_DISPOSITIVI,
        },
      ],
    },
    {
      titolo: t('gruppi.privacyNotifiche'),
      voci: [
        {
          chiave: 'privacy',
          etichetta: t('privacy'),
          sottotitolo: t('voci.privacySub'),
          valore: visibilita ? t(`visibilita.${CHIAVI[visibilita]}`) : undefined,
          icona: 'scudo',
          tinta: 'menta',
          href: percorsiApp.impostazioniPrivacy(),
        },
        {
          chiave: 'notifiche',
          etichetta: t('notifiche.titolo'),
          sottotitolo: t('voci.notificheSub'),
          valore: riassuntoAvvisi,
          icona: 'campana',
          tinta: 'ambra',
          href: percorsiApp.impostazioniNotifiche(),
        },
        {
          chiave: 'aspetto',
          etichetta: t('aspetto'),
          sottotitolo: t('voci.aspettoSub'),
          icona: 'luna',
          href: percorsiApp.impostazioniAspetto(),
        },
      ],
    },
    {
      titolo: t('gruppi.informazioni'),
      voci: [
        {
          chiave: 'doc',
          etichetta: t('leggiPrivacy.titolo'),
          sottotitolo: t('voci.privacyPolicySub'),
          icona: 'documento',
          esterno: percorsi.privacy(),
        },
        {
          chiave: 'termini',
          etichetta: t('voci.termini'),
          icona: 'documento',
          esterno: percorsi.termini(),
        },
        {
          chiave: 'linee',
          etichetta: t('voci.lineeGuida'),
          icona: 'documento',
          esterno: percorsi.lineeGuida(),
        },
      ],
    },
    {
      titolo: t('gruppi.tuoiDati'),
      voci: [
        {
          chiave: 'dati',
          etichetta: t('dati.titolo'),
          sottotitolo: t('voci.scaricaSub'),
          icona: 'scarica',
          tinta: 'blu',
          href: percorsiApp.impostazioniDati(),
        },
        {
          chiave: 'elimina',
          etichetta: t('elimina.titolo'),
          sottotitolo: t('voci.eliminaSub'),
          icona: 'cestino',
          distruttiva: true,
          href: percorsiApp.impostazioniElimina(),
        },
      ],
    },
  ];

  return (
    <nav aria-label={t('titolo')} className="flex flex-col gap-5">
      {gruppi.map((gruppo) => (
        <div key={gruppo.titolo}>
          <p className="mb-1.5 px-2 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-testo-debole">
            {gruppo.titolo}
          </p>
          <Elenco senzaBordo className="gap-0.5">
            {gruppo.voci.map((voce) => (
              <RigaElenco
                key={voce.chiave}
                etichetta={voce.etichetta}
                sottotitolo={voce.sottotitolo}
                valore={voce.valore}
                icona={voce.icona}
                tinta={voce.tinta}
                distruttiva={voce.distruttiva}
                presto={voce.presto}
                etichettaPresto={tComune('presto')}
                attiva={Boolean(voce.href) && percorso === voce.href}
                className="rounded-[13px] px-2.5 py-2.5"
                {...(voce.href
                  ? { come: Link, href: voce.href }
                  : voce.esterno
                    ? { come: Link, href: voce.esterno }
                    : {})}
              />
            ))}
          </Elenco>
        </div>
      ))}
    </nav>
  );
}
