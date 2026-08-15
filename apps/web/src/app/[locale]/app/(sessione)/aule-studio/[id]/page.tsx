import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { SalaAula } from '@/components/app/sala/sala-aula';

type Parametri = { locale: string; id: string };

/**
 * Nessun `generateStaticParams`: le aule sono contenuti degli utenti, non
 * pagine del sito. Ogni indirizzo si risolve a richiesta, e chi non può
 * vederla riceve dal server la stessa risposta di un'aula che non esiste.
 */
export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const t = await getTranslations({ locale: lingua, namespace: 'app.aule' });

  return creaMetadata({
    lingua,
    percorso: percorsiApp.aulaStudio(id),
    titolo: t('titolo'),
    noIndex: true,
  });
}

/** Dentro un'aula studio: la schermata dove si passa il tempo. */
export default async function PaginaSala({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;

  return <SalaAula aulaId={id} />;
}
