import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { AppTopbar } from '@/components/app/app-topbar';
import { SceltaTema } from '@/components/app/scelta-tema';
import { SchedaProfilo } from '@/components/app/scheda-profilo';
import { ModificaProfilo } from '@/components/app/modifica-profilo';
import { ImpostazioniPrivacy } from '@/components/app/impostazioni-privacy';
import { ImpostazioniNotifiche } from '@/components/app/impostazioni-notifiche';
import { UtentiBloccati } from '@/components/app/utenti-bloccati';
import { SessioneAccount } from '@/components/app/sessione-account';
import { ScaricaDati } from '@/components/app/scarica-dati';
import { EliminaAccount } from '@/components/app/elimina-account';
import { Card } from '@/components/ui';
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
 * **Qui c'è solo ciò che funziona.** Notifiche, download dei dati, uscita da
 * tutti i dispositivi, modifica del profilo e della foto stavano a schermo
 * senza niente dietro: una riga che non fa nulla è una promessa falsa, e in
 * una schermata di impostazioni è anche peggio — è il posto dove si va per
 * mettere le cose a posto, e crederci sbagliato è indistinguibile
 * dall'esserci riusciti. Sono tornate una per una, quando c'era qualcosa da
 * collegare.
 *
 * Gli avvisi sono l'unico caso a metà, e per questo la loro scheda **dichiara
 * il proprio stato**: le preferenze si salvano davvero e il server le rispetta,
 * ma nessun avviso viene ancora recapitato perché non c'è un fornitore. È
 * l'opposto degli interruttori tolti a luglio, che si dicevano attivi e non
 * salvavano niente: qui la parte mancante è scritta sulla scheda.
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

  const sezioni = ['profilo', 'privacy', 'notifiche', 'aspetto', 'account'] as const;

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
          {sezioni.map((sezione) => (
            <a
              key={sezione}
              href={`#${sezione}`}
              className="mb-0.5 block rounded-[11px] px-3 py-2.5 text-[13px] font-semibold text-testo-tenue transition-colors hover:bg-superficie-alt hover:text-testo"
            >
              {t(`nav.${sezione}`)}
            </a>
          ))}
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="max-w-[680px]">
            <section id="profilo" className="scroll-mt-6">
              <SchedaProfilo />
              <ModificaProfilo />
            </section>

            <section id="privacy" className="scroll-mt-6">
              <EtichettaSezione>{t('privacy')}</EtichettaSezione>
              <ImpostazioniPrivacy />
              <UtentiBloccati />
            </section>

            <section id="notifiche" className="scroll-mt-6">
              <EtichettaSezione>{t('nav.notifiche')}</EtichettaSezione>
              <ImpostazioniNotifiche />
            </section>

            <section id="aspetto" className="scroll-mt-6">
              <EtichettaSezione>{t('aspetto')}</EtichettaSezione>
              <Card padding="md" className="mb-6">
                <p className="mb-2.5 text-[14.5px] font-extrabold text-testo">{t('tema')}</p>
                <SceltaTema />
              </Card>
            </section>

            <section id="account" className="scroll-mt-6">
              <EtichettaSezione>{t('sessione')}</EtichettaSezione>
              <SessioneAccount />
              <ScaricaDati />

              <EtichettaSezione>{t('account')}</EtichettaSezione>
              <EliminaAccount />
            </section>
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
