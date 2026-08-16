import { getTranslations } from 'next-intl/server';
import { linguaDellaRotta, linguaDeiMetadati } from '@/lib/pagina';
import { creaMetadata } from '@/lib/seo';
import { percorsiApp } from '@/lib/percorsi-app';
import { TestataPannello } from '@/components/app/testata-pannello';
import { EliminaAccount } from '@/components/app/elimina-account';
import { Card } from '@/components/ui';

const PUNTI = ['uno', 'due', 'tre'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const lingua = await linguaDeiMetadati(params);
  const t = await getTranslations({ locale: lingua, namespace: 'app.impostazioni' });
  return creaMetadata({
    lingua,
    percorso: percorsiApp.impostazioniElimina(),
    titolo: `${t('elimina.titolo')} · ${t('titolo')}`,
    noIndex: true,
  });
}

/**
 * Eliminazione dell'account.
 *
 * Gli store chiedono che sia raggiungibile; noi vogliamo che sia **chiara**.
 * Tre passi numerati prima del bottone, con le stesse parole della privacy
 * policy e della schermata sul telefono — anonimizzazione, 30 giorni,
 * riattivazione entro 14. I due numeri non si contraddicono: la grazia è di 14
 * giorni, poi la cancellazione esegue, e i backup ruotano ogni 14 — trenta è
 * il limite superiore vero.
 *
 * L'alternativa che il disegno metteva accanto al bottone — «disattiva
 * temporaneamente» — **non c'è**: era stata tolta perché non definita da
 * nessun documento, e rimetterla come consiglio manderebbe qualcuno a cercare
 * un comando che non esiste. Le alternative offerte sono le tre vere.
 */
export default async function PaginaElimina({ params }: { params: Promise<{ locale: string }> }) {
  await linguaDellaRotta(params);
  const t = await getTranslations('app.impostazioni');

  return (
    <>
      <TestataPannello titolo={t('elimina.titolo')} sommario={t('pannello.elimina')} />

      <ol className="mb-6 flex flex-col gap-3">
        {PUNTI.map((punto, indice) => (
          <li
            key={punto}
            className="flex items-start gap-3.5 rounded-[18px] bg-superficie-alt px-4 py-3.5"
          >
            <span
              aria-hidden
              className="grid size-7 flex-none place-items-center rounded-xl bg-tinta-menta text-[13px] font-extrabold text-tinta-menta-testo"
            >
              {indice + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-extrabold text-testo">
                {t(`elimina.punti.${punto}.titolo`)}
              </span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-testo-tenue">
                {t(`elimina.punti.${punto}.testo`)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <Card variante="menta" padding="md" className="mb-6">
        <p className="text-[12.5px] leading-relaxed text-tinta-menta-testo">
          {t('elimina.alternativa')}
        </p>
      </Card>

      <EliminaAccount />
    </>
  );
}
