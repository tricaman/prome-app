import type { ReactNode } from 'react';
import type { Lingua } from '@prome/i18n';
import type { SezioneLegale } from '@/content';
import { briciole } from '@/lib/schema';
import { Breadcrumb, Container, NavLegale, SiteShell, type VoceBriciole } from '@/components/layout';
import { StructuredData } from '@/components/seo/structured-data';
import { Card, Heading } from '@/components/ui';

export interface DocumentoLegaleProps {
  lingua: Lingua;
  /** Href del documento: decide quale voce della nav risulta corrente. */
  percorso: string;
  voci: readonly VoceBriciole[];
  titolo: string;
  /** Data di entrata in vigore e versione: assente sulle linee guida. */
  vigore?: string;
  etichette: {
    documenti: string;
    inQuestaPagina: string;
    inBreve: string;
    soloItaliano: string;
  };
  inBreve: readonly string[];
  sezioni: readonly SezioneLegale[];
  /** In fondo al documento: il riquadro con l'indirizzo a cui scrivere. */
  children?: ReactNode;
}

/**
 * Un documento legale: privacy, termini, cookie, linee guida.
 *
 * Sono quattro pagine con la stessa forma — riepilogo senza legalese, poi le
 * sezioni numerate, con l'indice a fianco — e tenerle in un componente solo
 * non è un risparmio di righe: è la garanzia che restino riconoscibili come
 * documenti dello stesso insieme. Quando la privacy cambia impaginazione,
 * cambiano tutti e quattro insieme, o nessuno.
 *
 * Il testo vive in `@prome/contenuti`, in italiano soltanto: un documento
 * legale tradotto a macchina è peggio di un documento assente, e la pagina lo
 * dichiara a chi naviga in inglese.
 */
export function DocumentoLegale({
  lingua,
  percorso,
  voci,
  titolo,
  vigore,
  etichette,
  inBreve,
  sezioni,
  children,
}: DocumentoLegaleProps) {
  return (
    <SiteShell sfondo="piena">
      <StructuredData oggetti={[briciole(lingua, voci)]} />

      <Container larghezza="media" className="py-8">
        <div className="grid items-start gap-10 lg:grid-cols-[230px_1fr]">
          {/* Le legali si consultano per punti, non si leggono in sequenza. */}
          <nav className="lg:sticky lg:top-24" aria-label={etichette.documenti}>
            <NavLegale corrente={percorso} titolo={etichette.documenti} />

            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
              {etichette.inQuestaPagina}
            </p>
            <ul className="flex flex-col gap-2">
              {sezioni.map((sezione) => (
                <li key={sezione.id}>
                  <a
                    href={`#${sezione.id}`}
                    className="text-[12.5px] font-semibold leading-snug text-testo-tenue hover:text-primario-collegamento"
                  >
                    {sezione.titolo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Breadcrumb voci={voci} className="mb-4" />
            <Heading livello={1} taglia="xl">
              {titolo}
            </Heading>
            {vigore ? (
              <p className="mt-2.5 text-[13.5px] font-bold text-testo-debole">{vigore}</p>
            ) : null}

            {lingua !== 'it' ? (
              <p className="mt-4 rounded-2xl border border-tinta-ambra-bordo bg-tinta-ambra px-4 py-3 text-[13.5px] font-semibold text-tinta-ambra-testo">
                {etichette.soloItaliano}
              </p>
            ) : null}

            <Card variante="menta" padding="md" className="mt-6 rounded-[18px]">
              <Heading taglia="sm" className="text-tinta-menta-testo">
                {etichette.inBreve}
              </Heading>
              <ul className="mt-3 flex flex-col gap-2.5">
                {inBreve.map((punto) => (
                  <li key={punto.slice(0, 30)} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-[22px] flex-none place-items-center rounded-full bg-superficie text-xs font-extrabold text-primario-accento"
                    >
                      ✓
                    </span>
                    <span className="text-sm leading-relaxed text-primario-accento">{punto}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="mt-8">
              {sezioni.map((sezione) => (
                <section key={sezione.id} id={sezione.id} className="mb-7 scroll-mt-24">
                  <Heading taglia="md">{sezione.titolo}</Heading>
                  <p className="mt-3 whitespace-pre-line text-[15.5px] leading-[1.8] text-testo-corpo">
                    {sezione.corpo}
                  </p>
                </section>
              ))}
            </div>

            {children}
          </div>
        </div>
      </Container>
    </SiteShell>
  );
}
