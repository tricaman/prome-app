import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { TestataPannello } from '@/components/app/testata-pannello';
import { ScaricaDati } from '@/components/app/scarica-dati';
import { SessioneAccount } from '@/components/app/sessione-account';
import { SectionLabel } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.impostazioni' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.impostazioniDati(),
    titolo: `${t('dati.titolo')} · ${t('titolo')}`,
    noIndex: true,
  });
}

/**
 * Scarica i tuoi dati, e le sessioni aperte.
 *
 * Il file **si compone e si scarica subito**. Il disegno raccontava un'altra
 * cosa — «richiedi l'archivio», fino a 48 ore, una mail con un collegamento
 * valido 7 giorni — che è il modo in cui lo fanno i prodotti grandi perché
 * devono. Qui l'endpoint risponde nel momento in cui glielo si chiede, e
 * mettere davanti un'attesa che non esiste sarebbe peggiorare il prodotto per
 * somigliare a qualcun altro.
 *
 * Le due uscite stanno qui e non in una sezione «Account» propria: quella
 * sezione conterrebbe l'email e i dispositivi, che non esistono. Una sezione
 * fatta di due righe spente non è una sezione.
 */
export default async function PaginaDati({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni');

  return (
    <>
      <TestataPannello titolo={t('dati.titolo')} sommario={t('pannello.dati')} />
      <ScaricaDati />

      <SectionLabel>{t('sessione')}</SectionLabel>
      <SessioneAccount />
    </>
  );
}
