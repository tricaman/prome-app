import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { percorsi } from '@/content';
import { Link } from '@/i18n/navigazione';
import { TestataPannello } from '@/components/app/testata-pannello';
import { ImpostazioniPrivacy } from '@/components/app/impostazioni-privacy';
import { ImpostazioniContattabilita } from '@/components/app/impostazioni-contattabilita';
import { UtentiBloccati } from '@/components/app/utenti-bloccati';
import { Card, Icona } from '@/components/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.impostazioni' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.impostazioniPrivacy(),
    titolo: `${t('privacy')} · ${t('titolo')}`,
    noIndex: true,
  });
}

/**
 * Privacy.
 *
 * Le due privacy del modello restano due schede distinte, ognuna con la sua
 * spiegazione: il dominio ha rifiutato esplicitamente l'idea di un «livello di
 * privacy» unico, e riassumerle in un aggettivo — profilo aperto, profilo
 * chiuso — sarebbe rimetterla dentro dall'interfaccia.
 *
 * **L'ordine è quello di frequenza d'uso**: prima quello che funziona, poi
 * quello che non è ancora applicato. Aprire con una scheda spenta è la peggior
 * prima impressione che questa pagina possa fare.
 *
 * In fondo il rimando alla privacy policy: la pagina legale si raggiunge dal
 * punto in cui si sta già pensando ai propri dati, non solo da un elenco di
 * collegamenti.
 */
export default async function PaginaPrivacy({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni');

  return (
    <>
      <TestataPannello titolo={t('privacy')} sommario={t('pannello.privacy')} />

      <ImpostazioniPrivacy />
      <ImpostazioniContattabilita />
      <UtentiBloccati />

      <Card
        come={Link}
        href={percorsi.privacy()}
        variante="tenue"
        padding="md"
        className="flex items-center gap-3.5 transition-colors hover:border-tinta-menta-bordo"
      >
        <span
          aria-hidden
          className="grid size-10 flex-none place-items-center rounded-xl bg-superficie text-testo-tenue"
        >
          <Icona nome="documento" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold text-testo">
            {t('leggiPrivacy.titolo')}
          </span>
          <span className="mt-0.5 block text-[11.5px] text-testo-tenue">
            {t('leggiPrivacy.testo')}
          </span>
        </span>
        <Icona nome="avanti" dimensione={18} className="flex-none text-testo-debole" />
      </Card>
    </>
  );
}
