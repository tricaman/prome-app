'use client';

import { useTranslations } from 'next-intl';
import {
  concediPermesso,
  getApriSalaAulaStudioQueryKey,
  promuoviAModeratore,
  retrocediDaModeratore,
  revocaPermesso,
  rimuoviPartecipante,
  type PartecipanteDto,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Avatar, Button, Card, Chip, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';

/** I tre permessi, nell'ordine in cui il dominio li nomina. */
const PERMESSI = ['parlare', 'scrivere', 'caricare'] as const;
type NomePermesso = (typeof PERMESSI)[number];

export interface TabellaPermessiProps {
  aulaId: string;
  partecipanti: PartecipanteDto[];
  sonoModeratore: boolean;
}

/**
 * Gestione dei permessi dei partecipanti.
 *
 * Una riga per persona e tre interruttori indipendenti, perché nel dominio i
 * permessi si concedono e si revocano **uno alla volta**: non esiste un
 * livello «collaboratore» che li accende in blocco, e ogni interruttore è una
 * chiamata a sé.
 *
 * Le righe dei moderatori mostrano gli interruttori accesi e non modificabili:
 * è più onesto che nasconderli, perché spiega la regola — un moderatore ha
 * sempre i tre permessi — invece di far sembrare la funzione rotta.
 */
export function TabellaPermessi({ aulaId, partecipanti, sonoModeratore }: TabellaPermessiProps) {
  const t = useTranslations('app.sala');
  const tComune = useTranslations('comune');
  const chiaveSala = getApriSalaAulaStudioQueryKey(aulaId);

  const cambia = useApiMutation({
    mutationFn: ({
      utenteId,
      permesso,
      concedi,
    }: {
      utenteId: string;
      permesso: NomePermesso;
      concedi: boolean;
    }) =>
      concedi
        ? concediPermesso(aulaId, utenteId, permesso)
        : revocaPermesso(aulaId, utenteId, permesso),
    invalida: [chiaveSala as never],
  });

  const promuovi = useApiMutation({
    mutationFn: (utenteId: string) => promuoviAModeratore(aulaId, utenteId),
    invalida: [chiaveSala as never],
  });

  const retrocedi = useApiMutation({
    mutationFn: (utenteId: string) => retrocediDaModeratore(aulaId, utenteId),
    invalida: [chiaveSala as never],
  });

  const rimuovi = useApiMutation({
    mutationFn: (utenteId: string) => rimuoviPartecipante(aulaId, utenteId),
    invalida: [chiaveSala as never],
  });

  return (
    <Card padding="nessuno" className="overflow-hidden">
      {/* Intestazione visibile solo dove c'è spazio per le tre colonne. */}
      <div className="hidden items-center gap-3.5 border-b border-bordo bg-superficie-alt px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-testo-debole lg:flex">
        <span className="flex-1">{t('tabella.partecipante')}</span>
        {PERMESSI.map((permesso) => (
          <span key={permesso} className="w-[88px] text-center">
            {t(`tabella.${permesso}`)}
          </span>
        ))}
        {sonoModeratore ? <span className="w-[160px]" /> : null}
      </div>

      <ul>
        {partecipanti.map((partecipante, indice) => {
          const nome =
            [partecipante.nome, partecipante.cognome].filter(Boolean).join(' ') ||
            tComune('utenteRimosso');

          return (
            <li
              key={partecipante.utenteId}
              className={cn(
                'flex flex-wrap items-center gap-3.5 px-5 py-3.5',
                indice < partecipanti.length - 1 && 'border-b border-superficie-alt-2',
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nome={nome} dimensione={36} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-testo">{nome}</span>
                    {partecipante.moderatore ? (
                      <Chip tono="menta">{t('ruoli.moderatore')}</Chip>
                    ) : null}
                    {partecipante.solaLettura ? <Chip>{t('ruoli.solaLettura')}</Chip> : null}
                  </span>
                  {partecipante.universita ? (
                    <span className="mt-0.5 block truncate text-[12px] text-testo-didascalia">
                      {partecipante.universita}
                    </span>
                  ) : null}
                </span>
              </span>

              {PERMESSI.map((permesso) => (
                <span key={permesso} className="flex w-[88px] justify-center">
                  <Switch
                    etichetta={`${t(`tabella.${permesso}`)} — ${nome}`}
                    attivo={partecipante.permessi[permesso]}
                    // Un moderatore ha sempre i tre permessi finché dura il
                    // ruolo: l'interruttore resta acceso e bloccato.
                    bloccatoAcceso={partecipante.moderatore}
                    onChange={(attivo) =>
                      cambia.mutate({
                        utenteId: partecipante.utenteId,
                        permesso,
                        concedi: attivo,
                      })
                    }
                  />
                </span>
              ))}

              {sonoModeratore ? (
                <span className="flex w-[160px] justify-end gap-2">
                  {partecipante.moderatore ? (
                    // Mancava del tutto: si promuoveva e non si poteva più
                    // tornare indietro. L'ultimo moderatore lo ferma il server
                    // (AS2), con il messaggio che dice cosa fare.
                    <Button
                      variante="contorno"
                      className="h-9 rounded-xl px-3 text-[12px]"
                      onPress={() => retrocedi.mutate(partecipante.utenteId)}
                    >
                      {t('retrocedi')}
                    </Button>
                  ) : (
                    <Button
                      variante="contorno"
                      className="h-9 rounded-xl px-3 text-[12px]"
                      onPress={() => promuovi.mutate(partecipante.utenteId)}
                    >
                      {t('promuovi')}
                    </Button>
                  )}
                  <Button
                    variante="fantasma"
                    className="h-9 rounded-xl px-3 text-[12px] text-errore"
                    onPress={() => rimuovi.mutate(partecipante.utenteId)}
                  >
                    {tComune('elimina')}
                  </Button>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
