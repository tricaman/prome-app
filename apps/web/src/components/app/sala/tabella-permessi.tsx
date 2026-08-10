'use client';

import { useTranslations } from 'next-intl';
import { PARTECIPANTI } from '@/content';
import { Avatar, Button, Card, Chip, Icona, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import { eSolaLettura, PERMESSI, permessiDi, type NomePermesso, type Permessi } from './permessi';

export interface TabellaPermessiProps {
  permessi: Record<string, Permessi>;
  onCambia: (idPartecipante: string, permesso: NomePermesso, attivo: boolean) => void;
}

/**
 * Gestione dei permessi dei partecipanti.
 *
 * Una riga per persona e tre interruttori indipendenti, perché nel dominio i
 * permessi si concedono e si revocano uno alla volta: non esiste un livello
 * "collaboratore" che li accende in blocco.
 *
 * Le righe dei Moderatori mostrano gli interruttori accesi e non modificabili:
 * è più onesto che nasconderli, perché spiega la regola invece di far
 * sembrare la funzione rotta.
 */
export function TabellaPermessi({ permessi, onCambia }: TabellaPermessiProps) {
  const t = useTranslations('app.sala');

  const solaLettura = PARTECIPANTI.filter(
    (partecipante) =>
      !partecipante.moderatore && eSolaLettura(permessiDi(partecipante, permessi)),
  ).map((partecipante) => partecipante.nome);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3.5 rounded-2xl border border-tinta-menta-bordo bg-gradient-to-br from-tinta-menta to-tinta-menta-velo px-5 py-4">
        <span className="grid size-[42px] flex-none place-items-center rounded-[14px] bg-superficie text-primario-accento">
          <Icona nome="collegamento" dimensione={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-tinta-menta-testo">{t('linkInvito')}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-primario-accento">
            prome.app/a/9fk2 · {t('scadeIl', { data: '30 settembre' })}
          </span>
        </span>
        <Button className="h-10 rounded-xl px-4 text-[13px]">{t('copiaLink')}</Button>
        <Button
          variante="contorno"
          className="h-10 rounded-xl border-primary-300 bg-superficie/70 px-4 text-[13px] text-primario-accento"
        >
          {t('rigenera')}
        </Button>
      </div>

      <Card padding="nessuno" className="overflow-hidden">
        {/* Intestazione visibile solo dove c'è spazio per le tre colonne. */}
        <div className="hidden items-center gap-3.5 border-b border-bordo bg-superficie-alt px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-testo-debole lg:flex">
          <span className="flex-1">{t('tabella.partecipante')}</span>
          {PERMESSI.map((permesso) => (
            <span key={permesso} className="w-[88px] text-center">
              {t(`tabella.${permesso}`)}
            </span>
          ))}
          <span className="w-[100px]" />
        </div>

        <ul>
          {PARTECIPANTI.map((partecipante, indice) => {
            const suoi = permessiDi(partecipante, permessi);
            return (
              <li
                key={partecipante.id}
                className={cn(
                  'flex flex-wrap items-center gap-3.5 px-5 py-3.5',
                  indice < PARTECIPANTI.length - 1 && 'border-b border-superficie-alt-2',
                  partecipante.sonoIo && 'bg-superficie-alt',
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    nome={partecipante.nome}
                    dimensione={38}
                    className={partecipante.attivo ? 'ring-[2.5px] ring-primary-500' : undefined}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-testo">
                        {partecipante.nome}
                      </span>
                      {partecipante.moderatore ? (
                        <Chip tono="menta">{t('moderatore')}</Chip>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-testo-didascalia">
                      {partecipante.contesto}
                    </span>
                  </span>
                </span>

                {PERMESSI.map((permesso) => (
                  <span key={permesso} className="flex w-[88px] justify-center">
                    <Switch
                      etichetta={`${t(`tabella.${permesso}`)} — ${partecipante.nome}`}
                      attivo={suoi[permesso]}
                      bloccatoAcceso={partecipante.moderatore}
                      onChange={(attivo) => onCambia(partecipante.id, permesso, attivo)}
                    />
                  </span>
                ))}

                <span className="flex w-[100px] justify-end gap-2">
                  {!partecipante.moderatore ? (
                    <button
                      type="button"
                      className="text-[11.5px] font-extrabold text-primario-collegamento hover:text-primario-accento"
                    >
                      {t('promuovi')}
                    </button>
                  ) : null}
                  <span aria-hidden className="font-extrabold text-testo-debole">
                    ···
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Il riepilogo cambia con lo stato: dice cosa comporta davvero ciò che
          si è appena impostato, invece di ripetere una regola generica. */}
      <p className="mt-3.5 px-1 text-xs leading-relaxed text-testo-debole">
        {solaLettura.length === 0
          ? t('notaPermessi')
          : solaLettura.length === 1
            ? t('solaLettura', { nomi: solaLettura[0]! })
            : t('solaLetturaPlurale', { nomi: solaLettura.join(', ') })}
      </p>
    </div>
  );
}
