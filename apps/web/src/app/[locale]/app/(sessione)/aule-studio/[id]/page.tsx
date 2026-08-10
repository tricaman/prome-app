import { notFound } from 'next/navigation';
import { AULE_IN_CORSO } from '@/content';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { SalaAula } from '@/components/app/sala/sala-aula';

type Parametri = { locale: string; id: string };

export function generateStaticParams() {
  return AULE_IN_CORSO.map((aula) => ({ id: aula.id }));
}

export async function generateMetadata({ params }: { params: Promise<Parametri> }) {
  const lingua = await linguaDeiMetadati(params);
  const { id } = await params;
  const aula = AULE_IN_CORSO.find((voce) => voce.id === id);
  if (!aula) notFound();

  return creaMetadata({
    lingua,
    percorso: percorsiApp.aulaStudio(id),
    titolo: aula.titolo,
    noIndex: true,
  });
}

/** Dentro un'aula studio: la schermata dove si passa il tempo. */
export default async function PaginaSala({ params }: { params: Promise<Parametri> }) {
  await linguaDellaRotta(params);
  const { id } = await params;
  const aula = AULE_IN_CORSO.find((voce) => voce.id === id);
  if (!aula) notFound();

  return (
    <SalaAula
      titolo={aula.titolo}
      contesto={`${aula.contesto} · ${aula.partecipanti}`}
      gruppo={
        aula.gruppo
          ? { nome: aula.gruppo, slug: 'ingegneria-informatica-2026' }
          : undefined
      }
    />
  );
}
