'use client';

import { useTranslations } from 'next-intl';
import { useElencaAuleStudio } from '@prome/api-client';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link } from '@/i18n/navigazione';
import { Card, Chip, Icona } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';

/**
 * Le mie aule studio.
 *
 * **Nessun endpoint nuovo e nessun filtro nuovo**: `GET /aule-studio` risponde
 * già «le aule di cui faccio parte».
 *
 * Dice «le tue aule», non «le aule che hai creato», perché è ciò che il server
 * sa rispondere: chi ha aperto un'aula non è scritto da nessuna parte, e
 * l'unico indizio — essere moderatore — vale anche per chi è stato promosso
 * dopo. Un titolo che promette la paternità su un elenco che non la conosce è
 * una bugia piccola e gratuita.
 */
export function LeTueAule() {
  const t = useTranslations('app.profilo');
  const tAule = useTranslations('app.sala');
  const aule = useElencaAuleStudio({ limit: 50 });

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-6 sm:px-8">
      <QueryBoundary
        query={aule}
        eVuoto={(risposta) => risposta.data.length === 0}
        vuoto={<p className="py-10 text-center text-sm text-testo-tenue">{t('nessunaAula')}</p>}
      >
        {(risposta) => (
          <div className="grid gap-4 lg:grid-cols-2">
            {risposta.data.map((aula) => (
              <Card
                key={aula.id}
                come={Link}
                href={percorsiApp.aulaStudio(aula.id)}
                padding="md"
                className="transition-colors hover:border-tinta-menta-bordo"
              >
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {aula.sonoModeratore ? (
                    <Chip tono="menta">{tAule('ruoli.moderatore')}</Chip>
                  ) : null}
                  {aula.ateneo ? <Chip>{aula.ateneo}</Chip> : null}
                </div>

                <span className="block font-display text-[19px] font-extrabold leading-snug tracking-[-0.02em] text-testo">
                  {aula.titolo}
                </span>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[12.5px] font-bold text-testo-tenue">
                    {aula.partecipanti === 1
                      ? tAule('unPartecipante')
                      : tAule('nPartecipanti', { numero: aula.partecipanti })}
                  </span>
                  <Icona nome="avanti" dimensione={18} className="flex-none text-testo-debole" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
