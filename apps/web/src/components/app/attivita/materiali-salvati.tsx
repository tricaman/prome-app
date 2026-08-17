'use client';

import { useTranslations } from 'next-intl';
import {
  dimenticaMateriale,
  getElencaMaterialiSalvatiQueryKey,
  useElencaMaterialiSalvati,
} from '@prome/api-client';
import { pesoLeggibile } from '@prome/app-core';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { useApiMutation } from '@/hooks';
import { Button, Card, Icona } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

/**
 * I materiali messi da parte, da tutte le aule.
 *
 * **Ogni riga porta l'aula da cui viene**, e non è decorazione: «Esercizi
 * 3.pdf» dice qualcosa solo insieme ad «Analisi 1», e da lì si torna nell'aula
 * — che è quasi sempre la ragione per cui lo si era messo da parte.
 *
 * Non ci sono i materiali delle aule che si sono lasciate: il salvataggio
 * resta scritto e ricompare rientrando, ma la visibilità si risolve **adesso**,
 * come dappertutto.
 */
export function MaterialiSalvati() {
  const t = useTranslations('app.materialiSalvati');
  const salvati = useElencaMaterialiSalvati({ limit: 50 });
  const chiave = getElencaMaterialiSalvatiQueryKey({ limit: 50 });

  const dimentica = useApiMutation({
    mutationFn: (materialeId: string) => dimenticaMateriale(materialeId),
    invalida: [chiave as never],
  });

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-6 sm:px-8">
      <QueryBoundary
        query={salvati}
        eVuoto={(risposta) => risposta.data.length === 0}
        vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('vuoto')}</p>}
      >
        {(risposta) => (
          <Card padding="nessuno" className="overflow-hidden">
            <ul>
              {risposta.data.map((riga, indice) => (
                <li
                  key={riga.materiale.id}
                  className={
                    'flex flex-wrap items-center gap-3 px-5 py-3.5' +
                    (indice < risposta.data.length - 1 ? ' border-b border-superficie-alt-2' : '')
                  }
                >
                  <span className="min-w-0 flex-1">
                    {/* Il file si apre in una scheda nuova: il browser regge
                        PDF e immagini meglio di qualunque visore incorporato. */}
                    <a
                      href={riga.materiale.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[14px] font-extrabold text-testo hover:text-primario-collegamento"
                    >
                      {riga.materiale.nome}
                    </a>
                    <span className="mt-0.5 block truncate text-[12px] text-testo-didascalia">
                      {pesoLeggibile(riga.materiale.dimensione)} ·{' '}
                      <Link
                        href={percorsiApp.aulaStudio(riga.aulaStudioId)}
                        className="hover:text-primario-collegamento"
                      >
                        {t('da', { aula: riga.titoloAula })}
                      </Link>
                    </span>
                  </span>

                  <Button
                    variante="fantasma"
                    className="h-9 rounded-xl px-3 text-[12px]"
                    aria-label={t('salvato')}
                    isDisabled={dimentica.isPending}
                    onPress={() => dimentica.mutate(riga.materiale.id)}
                    iconaSinistra={<Icona nome="salva" dimensione={16} />}
                  >
                    {t('salvato')}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
