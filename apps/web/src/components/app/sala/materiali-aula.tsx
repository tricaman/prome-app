'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { caricaConAvanzamento, pesoLeggibile } from '@prome/app-core';
import {
  condividiMaterialeAula,
  creaArgomento,
  eliminaArgomento,
  eliminaMaterialeAula,
  getApriSalaAulaStudioQueryKey,
  useLeggiMioProfilo,
  preautorizzaMaterialeAula,
  type ArgomentoDto,
  type MaterialeDto,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Button, Card, Icona } from '@/components/ui';
import { SIGLA_ALLEGATO } from '@/components/contenuti';
import { cn } from '@/lib/utils';

export interface MaterialiAulaProps {
  aulaId: string;
  argomenti: ArgomentoDto[];
  allegati: MaterialeDto[];
  puoCaricare: boolean;
  sonoModeratore: boolean;
}

/**
 * Materiali dell'aula, raggruppati per argomento.
 *
 * L'ultimo gruppo è «senza argomento»: i file caricati in fretta durante una
 * sessione finiscono lì e restano usabili. Obbligare a scegliere un argomento
 * al momento del caricamento farebbe smettere di caricare — ed è anche il
 * motivo per cui eliminare un argomento non cancella niente: i materiali
 * tornano semplicemente sciolti.
 */
export function MaterialiAula({
  aulaId,
  argomenti,
  allegati,
  puoCaricare,
  sonoModeratore,
}: MaterialiAulaProps) {
  const t = useTranslations('app.sala');
  const [nuovoArgomento, setNuovoArgomento] = useState('');
  const chiaveSala = getApriSalaAulaStudioQueryKey(aulaId);

  const aggiungiArgomento = useApiMutation({
    mutationFn: (titolo: string) => creaArgomento(aulaId, { titolo }),
    invalida: [chiaveSala as never],
    onSuccess: () => setNuovoArgomento(''),
  });

  const togliArgomento = useApiMutation({
    mutationFn: (argomentoId: string) => eliminaArgomento(aulaId, argomentoId),
    invalida: [chiaveSala as never],
  });

  // Un materiale si caricava e non si toglieva più: `eliminaMaterialeAula`
  // esisteva nell'API e nessun client la chiamava.
  const eliminaFile = useApiMutation({
    mutationFn: (materialeId: string) => eliminaMaterialeAula(aulaId, materialeId),
    invalida: [chiaveSala as never],
  });

  const io = useLeggiMioProfilo();
  const mioId = io.data?.data.utenteId;

  /**
   * Tre tempi, come per gli allegati dei post: si dichiara il file, i byte
   * vanno **direttamente all'archivio**, poi si comunica la chiave. I byte non
   * passano dagli endpoint di dominio.
   */
  const carica = useApiMutation({
    mutationFn: async (file: File) => {
      const preautorizzazione = await preautorizzaMaterialeAula(aulaId, {
        nome: file.name,
        tipo: tipoDi(file),
        dimensione: file.size,
      });
      const { chiave, url } = preautorizzazione.data;
      // Il tipo lo dichiara il browser: è più preciso del generico che
      // l'archivio si aspetterebbe.
      await caricaConAvanzamento({
        url,
        corpo: file,
        intestazioni: { 'content-type': file.type },
      });
      return condividiMaterialeAula(aulaId, { chiave });
    },
    invalida: [chiaveSala as never],
  });

  const gruppi = raggruppa(argomenti, allegati);

  return (
    <div className="flex-1 overflow-y-auto bg-sfondo px-6 py-5">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {puoCaricare ? (
          <label className="inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-[14px] bg-primario px-4 text-[13.5px] font-semibold text-primario-testo">
            <Icona nome="carica" dimensione={17} />
            {carica.isPending ? t('caricamentoInCorso') : t('caricaMateriale')}
            <input
              type="file"
              className="sr-only"
              onChange={(evento) => {
                const file = evento.target.files?.[0];
                if (file) carica.mutate(file);
                evento.target.value = '';
              }}
            />
          </label>
        ) : null}

        {sonoModeratore ? (
          <span className="flex items-center gap-2">
            <input
              value={nuovoArgomento}
              onChange={(evento) => setNuovoArgomento(evento.target.value)}
              placeholder={t('nuovoArgomento')}
              aria-label={t('nuovoArgomento')}
              className="h-[42px] rounded-[14px] border-2 border-bordo bg-superficie px-3.5 text-[13.5px] text-testo"
            />
            <Button
              variante="contorno"
              className="h-[42px] rounded-[14px] px-4 text-[13.5px]"
              isDisabled={!nuovoArgomento.trim()}
              inCaricamento={aggiungiArgomento.isPending}
              onPress={() => aggiungiArgomento.mutate(nuovoArgomento.trim())}
            >
              +
            </Button>
          </span>
        ) : null}

        <span className="ml-auto text-[12.5px] font-bold text-testo-debole">
          {t('conteggioFile', { numero: allegati.length })}
        </span>
      </div>

      {allegati.length === 0 && argomenti.length === 0 ? (
        <p className="py-10 text-center text-sm text-testo-tenue">{t('nessunMateriale')}</p>
      ) : null}

      <div className="flex flex-col gap-5">
        {gruppi.map((gruppo) => (
          <section key={gruppo.argomento?.id ?? 'senza-argomento'}>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="text-[13.5px] font-extrabold text-testo">
                {gruppo.argomento?.titolo ?? t('senzaArgomento')}
              </span>
              <span className="text-[12px] text-testo-debole">
                {t('conteggioFile', { numero: gruppo.file.length })}
              </span>
              {sonoModeratore && gruppo.argomento ? (
                <Button
                  variante="fantasma"
                  className="h-8 px-2 text-[12px] text-testo-tenue"
                  onPress={() => togliArgomento.mutate(gruppo.argomento!.id)}
                >
                  {t('eliminaArgomento')}
                </Button>
              ) : null}
            </div>

            <Card padding="nessuno" className="overflow-hidden">
              <ul>
                {gruppo.file.map((file, indice) => (
                  <li
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3.5 px-5 py-3.5',
                      indice < gruppo.file.length - 1 && 'border-b border-superficie-alt-2',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-[38px] flex-none place-items-center rounded-xl bg-superficie-alt-2 text-[10px] font-extrabold text-testo-tenue"
                    >
                      {SIGLA_ALLEGATO[siglaDi(file.tipo)]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-bold text-testo hover:text-primario-collegamento"
                      >
                        {file.nome}
                      </a>
                      <span className="mt-0.5 block text-[12px] text-testo-didascalia">
                        {pesoLeggibile(file.dimensione)}
                      </span>
                    </span>
                    {/* Lo toglie chi l'ha portato, e chi modera l'aula: la
                        stessa regola del server, dichiarata da lui. */}
                    {sonoModeratore || file.caricatoDa === mioId ? (
                      <button
                        type="button"
                        aria-label={t('eliminaMateriale')}
                        disabled={eliminaFile.isPending}
                        onClick={() => eliminaFile.mutate(file.id)}
                        className="flex-none rounded-lg p-1.5 text-testo-debole transition-colors hover:bg-superficie-alt hover:text-errore"
                      >
                        <Icona nome="cestino" dimensione={17} />
                      </button>
                    ) : null}
                  </li>
                ))}
                {gruppo.file.length === 0 ? (
                  <li className="px-5 py-3.5 text-[12.5px] text-testo-debole">
                    {t('argomentoVuoto')}
                  </li>
                ) : null}
              </ul>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Prima gli argomenti nell'ordine in cui esistono, poi i materiali sciolti. */
function raggruppa(argomenti: ArgomentoDto[], allegati: MaterialeDto[]) {
  const gruppi = argomenti.map((argomento) => ({
    argomento,
    file: allegati.filter((file) => file.argomentoId === argomento.id),
  }));
  const sciolti = allegati.filter((file) => !file.argomentoId);
  if (sciolti.length) gruppi.push({ argomento: null as unknown as ArgomentoDto, file: sciolti });
  return gruppi;
}

const siglaDi = (tipo: MaterialeDto['tipo']): 'pdf' | 'immagine' | 'testo' =>
  tipo === 'PDF' ? 'pdf' : tipo === 'IMMAGINE' ? 'immagine' : 'testo';

function tipoDi(file: File): MaterialeDto['tipo'] {
  if (file.type === 'application/pdf') return 'PDF';
  if (file.type.startsWith('image/')) return 'IMMAGINE';
  return 'TESTO';
}
