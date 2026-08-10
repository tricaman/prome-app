import { getTranslations } from 'next-intl/server';
import { UTENTE } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { SceltaTema } from '@/components/app/scelta-tema';
import {
  ImpostazioniNotifiche,
  ImpostazioniPrivacy,
} from '@/components/app/impostazioni-privacy';
import { Avatar, Button, Card, Heading, Icona } from '@/components/ui';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.impostazioni' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.impostazioni(),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/**
 * Impostazioni del profilo.
 *
 * L'eliminazione dell'account sta in fondo e in chiaro, con le stesse parole
 * della privacy policy: contenuti anonimizzati, dati cancellati entro 30
 * giorni, riattivazione entro 14. Se la schermata e il documento legale si
 * contraddicono, quello che resta all'utente è la sfiducia.
 */
export default async function PaginaImpostazioni({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni');

  const sezioni = ['profilo', 'privacy', 'notifiche', 'aspetto', 'account', 'dati'] as const;

  return (
    <>
      <AppTopbar
        titolo={
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">
            {t('titolo')}
          </span>
        }
      />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t('titolo')}
          className="hidden w-[230px] flex-none border-r border-bordo bg-superficie px-3.5 py-5 lg:block"
        >
          {sezioni.map((sezione, indice) => (
            <span
              key={sezione}
              className={cn(
                'mb-0.5 block rounded-[11px] px-3 py-2.5 text-[13px]',
                indice === 1
                  ? 'bg-tinta-menta font-extrabold text-primario-accento'
                  : 'font-semibold text-testo-tenue',
              )}
            >
              {t(`nav.${sezione}`)}
            </span>
          ))}
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="max-w-[680px]">
            <Card padding="md" className="mb-6 flex flex-wrap items-center gap-4">
              <Avatar nome={UTENTE.nome} dimensione={76} className="text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[22px] font-extrabold tracking-[-0.02em]">
                  {UTENTE.nome}
                </p>
                <p className="mt-1 text-[13.5px] text-testo-tenue">
                  {UTENTE.ateneo} · {UTENTE.corso}, {UTENTE.anno}
                </p>
                <p className="mt-0.5 text-[12.5px] text-testo-debole">{UTENTE.email}</p>
              </div>
              <div className="flex flex-none flex-col gap-2">
                <Button variante="contorno" className="h-10 rounded-xl px-4 text-[13px]">
                  {t('modificaProfilo')}
                </Button>
                <Button variante="tenue" className="h-10 rounded-xl px-4 text-[13px]">
                  {t('cambiaFoto')}
                </Button>
              </div>
            </Card>

            <EtichettaSezione>{t('privacy')}</EtichettaSezione>
            <ImpostazioniPrivacy />

            <EtichettaSezione className="mt-6">{t('aspetto')}</EtichettaSezione>
            <Card padding="nessuno" className="mb-6 overflow-hidden">
              <div className="border-b border-superficie-alt-2 px-5 py-5">
                <p className="mb-2.5 text-[14.5px] font-extrabold text-testo">{t('tema')}</p>
                <SceltaTema />
              </div>
              <ImpostazioniNotifiche />
            </Card>

            <EtichettaSezione>{t('account')}</EtichettaSezione>
            <Card padding="nessuno" className="mb-6 overflow-hidden">
              <RigaAccount etichetta={t('scaricaDati')} dettaglio={t('archivioCompleto')} />
              <RigaAccount etichetta={t('esciDaTutti')} ultima />
            </Card>

            {/* L'azione distruttiva è raggiungibile ma non invitante: bordo
                rosa, non un bottone rosso pieno che chiede di essere premuto. */}
            <Card padding="md" className="border-[1.5px] border-tinta-rosa-bordo">
              <Heading taglia="xs">{t('elimina.titolo')}</Heading>
              <p className="mb-4 mt-2.5 text-[13.5px] leading-[1.7] text-testo-tenue">
                {t('elimina.testo')}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="h-11 rounded-xl border-[1.5px] border-tinta-rosa-bordo bg-tinta-rosa-velo px-5 text-[13.5px] font-extrabold text-tinta-rosa-testo"
                >
                  {t('elimina.azione')}
                </button>
                <span className="text-[12.5px] text-testo-debole">
                  {t('elimina.pausa')}{' '}
                  <button type="button" className="font-extrabold text-primario-collegamento">
                    {t('elimina.disattiva')}
                  </button>
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function EtichettaSezione({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole',
        className,
      )}
    >
      {children}
    </p>
  );
}

function RigaAccount({
  etichetta,
  dettaglio,
  conFreccia = false,
  ultima = false,
}: {
  etichetta: string;
  dettaglio?: string;
  conFreccia?: boolean;
  ultima?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-superficie-alt',
        !ultima && 'border-b border-superficie-alt-2',
      )}
    >
      <span className="flex-1 text-sm font-bold text-testo">{etichetta}</span>
      {dettaglio ? (
        <span className="text-xs font-bold text-testo-debole">{dettaglio}</span>
      ) : null}
      {conFreccia ? <Icona nome="avanti" dimensione={17} className="text-testo-debole" /> : null}
    </button>
  );
}
