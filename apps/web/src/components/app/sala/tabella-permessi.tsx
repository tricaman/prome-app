'use client';

import { useTranslations } from 'next-intl';
import {
  concediPermesso,
  getApriSalaAulaStudioQueryKey,
  invitaUtenteInAulaStudio,
  promuoviAModeratore,
  retrocediDaModeratore,
  revocaPermesso,
  rimuoviPartecipante,
  useElencaAuleStudio,
  type PartecipanteDto,
} from '@prome/api-client';
import { useApiMutation } from '@/hooks';
import { Avatar, Card, Chip, Icona, Menu, Switch, VoceMenu } from '@/components/ui';
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

  /**
   * In quale aula si invita: **la prima che si modera**.
   *
   * Sul telefono si sceglie da un foglio; qui, dove la tabella è già larga,
   * un secondo menu per riga sarebbe rumore — e chi modera una sola aula, che
   * è il caso normale, non ha niente da scegliere. Con nessuna aula moderata
   * il pulsante resta spento: non c'è dove portare nessuno.
   */
  const mieAule = useElencaAuleStudio({ limit: 50 });
  const aulaDoveInvitare = (mieAule.data?.data ?? []).find((a) => a.sonoModeratore)?.id;

  const invita = useApiMutation({
    mutationFn: ({ aulaId: dove, utenteId }: { aulaId: string; utenteId: string }) =>
      invitaUtenteInAulaStudio(dove, { utenteId }),
    invalida: [],
  });

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
          // `contattabile` lo manda il server solo per chi si può invitare
          // altrove; di chi è stato rimosso non si invita nessuno.
          const puoInvitare = partecipante.contattabile !== undefined && !partecipante.rimosso;

          return (
            <li
              key={partecipante.utenteId}
              className={cn(
                'flex flex-wrap items-center gap-3.5 px-5 py-3.5',
                indice < partecipanti.length - 1 && 'border-b border-superficie-alt-2',
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nome={nome} foto={partecipante.foto} dimensione={36} />
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

              {/* **Un innesco solo, e un menu.**
                  Prima erano tre bottoni in fila — Invita, Promuovi/Retrocedi,
                  Elimina — con larghezze fisse: su una riga stretta finivano
                  uno sopra l'altro, e «Invita» spariva sotto «Non moderatore».
                  Tre comandi che si usano di rado non meritano tre bersagli
                  permanenti accanto a ogni nome: meritano un posto solo dove
                  cercarli.

                  Il divieto di contatto resta dichiarato **prima** del gesto,
                  come è sempre stato — ma diventa una voce spenta con la
                  ragione scritta sotto, perché in un menu non c'è il passaggio
                  del mouse a cui appendere una spiegazione. */}
              {sonoModeratore || puoInvitare ? (
                <Menu
                  etichetta={t('azioniSu', { nome })}
                  classNameInnesco="flex h-9 w-9 items-center justify-center rounded-xl text-testo-tenue hover:bg-superficie-alt-2 hover:text-testo"
                  innesco={<Icona nome="altro" dimensione={18} />}
                >
                  {puoInvitare ? (
                    <VoceMenu
                      icona="piu"
                      etichetta={t('invita')}
                      descrizione={
                        partecipante.contattabile ? t('invitaAltrove') : t('nonContattabile')
                      }
                      disattivata={!partecipante.contattabile || !aulaDoveInvitare}
                      onSeleziona={() =>
                        aulaDoveInvitare &&
                        invita.mutate({
                          aulaId: aulaDoveInvitare,
                          utenteId: partecipante.utenteId,
                        })
                      }
                    />
                  ) : null}

                  {sonoModeratore && partecipante.moderatore ? (
                    // L'ultimo moderatore lo ferma il server (AS2), con il
                    // messaggio che dice cosa fare.
                    <VoceMenu
                      icona="profilo"
                      etichetta={t('retrocedi')}
                      onSeleziona={() => retrocedi.mutate(partecipante.utenteId)}
                    />
                  ) : null}
                  {sonoModeratore && !partecipante.moderatore ? (
                    <VoceMenu
                      icona="scudo"
                      etichetta={t('promuovi')}
                      onSeleziona={() => promuovi.mutate(partecipante.utenteId)}
                    />
                  ) : null}
                  {sonoModeratore ? (
                    <VoceMenu
                      icona="cestino"
                      etichetta={tComune('elimina')}
                      distruttiva
                      onSeleziona={() => rimuovi.mutate(partecipante.utenteId)}
                    />
                  ) : null}
                </Menu>
              ) : null}

            </li>
          );
        })}
      </ul>
    </Card>
  );
}
