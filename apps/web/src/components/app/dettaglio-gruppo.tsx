'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import {
  eliminaGruppo,
  entraInAulaStudio,
  getElencaAuleStudioQueryKey,
  modificaGruppo,
  getElencaMieiGruppiQueryKey,
  getLeggiGruppoQueryKey,
  invitaNelGruppo,
  promuoviNelGruppo,
  retrocediNelGruppo,
  rimuoviMembro,
  useElencaAuleStudio,
  useLeggiGruppo,
  useLeggiMioProfilo,
  type AulaStudioDto,
  type DettaglioGruppoDto,
  type GruppoDto,
  type MembroDto,
} from '@prome/api-client';
import { useApiMutation, useForm } from '@/hooks';
import { percorsiApp } from '@/lib/percorsi-app';
import { Link, useRouter } from '@/i18n/navigazione';
import { Form, FormInput } from '@/components/form';
import { Avatar, Button, Card, Chip, Icona, Input } from '@/components/ui';
import { QueryBoundary } from '@/components/feedback';
import { cn } from '@/lib/utils';
import { etichettaVisibilita } from './elenco-gruppi';
import { SceltaVisibilitaGruppo } from './scelta-visibilita-gruppo';

/**
 * Un gruppo visto da dentro: chi ne fa parte, e le aule collocate qui.
 *
 * Non c'è l'albero delle cartelle che questa schermata mostrava prima: quelle
 * cartelle non esistono da nessuna parte, e a schermo erano sette livelli di
 * archivio inventato con dentro sempre gli stessi sei file. Torneranno quando
 * ci sarà un albero vero.
 *
 * I gesti di moderazione compaiono **solo a chi modera**, e non è una comodità:
 * un bottone che l'utente non ha diritto di premere è una promessa che il
 * server dovrà smentire.
 */
export function DettaglioGruppo({ gruppoId }: { gruppoId: string }) {
  const gruppo = useLeggiGruppo(gruppoId);

  return (
    <QueryBoundary query={gruppo} dimensione="piena">
      {({ data }) => <Contenuto gruppoId={gruppoId} dettaglio={data} />}
    </QueryBoundary>
  );
}

function Contenuto({
  gruppoId,
  dettaglio,
}: {
  gruppoId: string;
  dettaglio: DettaglioGruppoDto;
}) {
  const t = useTranslations('app.gruppo');
  const { gruppo, membri } = dettaglio;
  const io = useLeggiMioProfilo();
  const mioId = io.data?.data.utenteId;

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-6 sm:px-8">
      <Card padding="md" className="mb-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden
            className="grid size-16 flex-none place-items-center rounded-[18px] bg-tinta-menta font-display text-2xl font-extrabold text-tinta-menta-testo"
          >
            {gruppo.nome.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
              {gruppo.nome}
            </h1>
            <p className="mt-1 text-[13.5px] text-testo-tenue">
              {t('membri', { numero: gruppo.membri })}
              {gruppo.ateneo ? ` · ${gruppo.ateneo}` : ''}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Chip dimensione="sm">{t(`visibilita.${etichettaVisibilita(gruppo.visibilita)}`)}</Chip>
              {gruppo.sonoModeratore ? (
                <Chip tono="menta" dimensione="sm">
                  {t('moderatore')}
                </Chip>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {gruppo.sonoModeratore ? <ImpostazioniGruppo gruppo={gruppo} /> : null}
      {gruppo.sonoModeratore ? <Invito gruppoId={gruppoId} /> : null}

      <EtichettaSezione>{t('membri', { numero: gruppo.membri })}</EtichettaSezione>
      <Card padding="nessuno" className="mb-6 overflow-hidden">
        <ul>
          {membri.map((membro, indice) => (
            <li
              key={membro.utenteId}
              className={cn(indice < membri.length - 1 && 'border-b border-superficie-alt-2')}
            >
              <RigaMembro
                gruppoId={gruppoId}
                membro={membro}
                sonoModeratore={gruppo.sonoModeratore}
                sonoIo={membro.utenteId === mioId}
                unicoModeratore={membri.filter((m) => m.moderatore).length === 1}
              />
            </li>
          ))}
        </ul>
      </Card>

      <AuleDelGruppo gruppoId={gruppoId} />

      {gruppo.sonoModeratore ? <EliminaGruppo gruppoId={gruppoId} /> : null}
    </div>
  );
}

function RigaMembro({
  gruppoId,
  membro,
  sonoModeratore,
  sonoIo,
  unicoModeratore,
}: {
  gruppoId: string;
  membro: MembroDto;
  sonoModeratore: boolean;
  sonoIo: boolean;
  unicoModeratore: boolean;
}) {
  const t = useTranslations('app.gruppo');
  const tComune = useTranslations('comune');
  const router = useRouter();

  const nome = [membro.nome, membro.cognome].filter(Boolean).join(' ');
  const etichetta = membro.rimosso ? tComune('utenteRimosso') : nome || tComune('utenteRimosso');

  // G2 vale anche a schermo: l'unico moderatore non può togliersi il ruolo né
  // uscire, e il bottone che glielo farebbe credere non deve esserci.
  const bloccatoDaG2 = membro.moderatore && unicoModeratore;

  const invalida = [getLeggiGruppoQueryKey(gruppoId) as never, getElencaMieiGruppiQueryKey() as never];

  const promuovi = useApiMutation({
    mutationFn: () => promuoviNelGruppo(gruppoId, membro.utenteId),
    invalida,
  });
  const retrocedi = useApiMutation({
    mutationFn: () => retrocediNelGruppo(gruppoId, membro.utenteId),
    invalida,
  });
  const rimuovi = useApiMutation({
    mutationFn: () => rimuoviMembro(gruppoId, membro.utenteId),
    invalida,
    // Chi esce da solo non ha più un gruppo da guardare.
    onSuccess: () => {
      if (sonoIo) router.push(percorsiApp.gruppi());
    },
  });

  const inCorso = promuovi.isPending || retrocedi.isPending || rimuovi.isPending;

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <Avatar nome={etichetta} dimensione={38} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-testo">{etichetta}</span>
        {membro.universita ? (
          <span className="block truncate text-xs text-testo-didascalia">{membro.universita}</span>
        ) : null}
      </span>

      {membro.moderatore ? (
        <Chip tono="menta" dimensione="sm">
          {t('moderatore')}
        </Chip>
      ) : null}

      {sonoModeratore || sonoIo ? (
        <span className="flex flex-none flex-wrap items-center gap-1.5">
          {sonoModeratore && !membro.moderatore ? (
            <Button
              variante="tenue"
              className="h-9 rounded-[11px] px-3 text-[12.5px]"
              isDisabled={inCorso}
              onPress={() => promuovi.mutate(undefined)}
            >
              {t('promuovi')}
            </Button>
          ) : null}

          {sonoModeratore && membro.moderatore && !bloccatoDaG2 ? (
            <Button
              variante="tenue"
              className="h-9 rounded-[11px] px-3 text-[12.5px]"
              isDisabled={inCorso}
              onPress={() => retrocedi.mutate(undefined)}
            >
              {t('retrocedi')}
            </Button>
          ) : null}

          {!bloccatoDaG2 ? (
            <Button
              variante="contorno"
              className="h-9 rounded-[11px] px-3 text-[12.5px]"
              isDisabled={inCorso}
              onPress={() => rimuovi.mutate(undefined)}
            >
              {sonoIo ? t('esci') : t('rimuovi')}
            </Button>
          ) : null}

          {bloccatoDaG2 && sonoIo ? (
            <span className="text-[11.5px] text-testo-debole">{t('ultimoModeratore')}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Nome e visibilità del gruppo, per chi lo modera.
 *
 * Si sceglievano una volta alla creazione e non si toccavano più: `modificaGruppo`
 * esisteva nell'API e nessun client la chiamava.
 *
 * L'ateneo non c'è, ed è congelato alla creazione (G5). Un gruppo nato senza
 * ateneo non può essere riservato all'ateneo, e la scelta non viene offerta:
 * sarebbe un gruppo «di ateneo» visibile a nessuno.
 */
function ImpostazioniGruppo({ gruppo }: { gruppo: GruppoDto }) {
  const t = useTranslations('app.gruppo');
  const [nome, setNome] = useState(gruppo.nome);
  const [visibilita, setVisibilita] = useState(gruppo.visibilita);

  const salva = useApiMutation({
    mutationFn: () => modificaGruppo(gruppo.id, { nome, visibilita }),
    invalida: [
      getLeggiGruppoQueryKey(gruppo.id) as never,
      getElencaMieiGruppiQueryKey() as never,
    ],
  });

  return (
    <Card padding="md" className="mb-6">
      <p className="mb-3 text-[15px] font-extrabold text-testo">{t('impostazioni')}</p>

      <Input etichetta={t('nome')} valore={nome} onChange={setNome} />

      <p className="mb-2 mt-4 text-[12.5px] font-extrabold text-testo-tenue">{t('chiPuoVederlo')}</p>
      <SceltaVisibilitaGruppo
        valore={visibilita}
        onScegli={setVisibilita}
        senzaAteneo={!gruppo.ateneo}
      />

      <div className="mt-4 flex justify-end">
        <Button
          className="h-11 rounded-xl px-5"
          inCaricamento={salva.isPending}
          onPress={() => salva.mutate(undefined)}
        >
          {t('salva')}
        </Button>
      </div>
    </Card>
  );
}

const schemaInvito = z.object({ destinatario: z.string().email() });

function Invito({ gruppoId }: { gruppoId: string }) {
  const t = useTranslations('app.gruppo');
  const form = useForm({ schema: schemaInvito, defaultValues: { destinatario: '' } });

  const invita = useApiMutation({
    mutationFn: (dati: { destinatario: string }) => invitaNelGruppo(gruppoId, dati),
    form,
    onSuccess: () => form.reset(),
  });

  return (
    <Card padding="md" className="mb-6">
      <p className="text-[15px] font-extrabold text-testo">{t('invita')}</p>
      <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-testo-tenue">{t('invitaTesto')}</p>

      <Form form={form} onSubmit={(valori) => invita.mutate(valori)} id="invita-nel-gruppo">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-[240px] flex-1">
            <FormInput
              name="destinatario"
              etichetta={t('indirizzo')}
              segnaposto="compagno@studenti.unibo.it"
              tipo="email"
            />
          </div>
          <Button
            type="submit"
            form="invita-nel-gruppo"
            inCaricamento={invita.isPending}
            className="h-[46px] rounded-xl px-5"
          >
            {t('invita')}
          </Button>
        </div>
      </Form>
    </Card>
  );
}

/**
 * Le aule collocate qui.
 *
 * Le chiede al contesto che le possiede: **il gruppo non conosce le aule**, e
 * non deve impararlo per disegnare una schermata.
 */
function AuleDelGruppo({ gruppoId }: { gruppoId: string }) {
  const t = useTranslations('app.gruppo');
  // Le aule **del gruppo**, non le mie: comprese quelle in cui non sono ancora
  // entrato. Senza questa domanda la collocazione non servirebbe a niente —
  // un membro non avrebbe modo di trovarle.
  const aule = useElencaAuleStudio({ gruppoId, limit: 50 });

  return (
    <>
      <EtichettaSezione>{t('aule')}</EtichettaSezione>
      <QueryBoundary query={aule} caricamento={<span />}>
        {(risposta) => {
          const nostre = risposta.data;
          if (!nostre.length) {
            return (
              <Card padding="md" className="mb-6">
                <p className="text-[13.5px] text-testo-tenue">{t('nessunAula')}</p>
                <p className="mt-1 text-[12.5px] text-testo-debole">{t('collocaTesto')}</p>
              </Card>
            );
          }

          return (
            <Card padding="nessuno" className="mb-6 overflow-hidden">
              <ul>
                {nostre.map((aula, indice) => (
                  <li
                    key={aula.id}
                    className={cn(indice < nostre.length - 1 && 'border-b border-superficie-alt-2')}
                  >
                    <RigaAula aula={aula} />
                  </li>
                ))}
              </ul>
            </Card>
          );
        }}
      </QueryBoundary>
    </>
  );
}

/**
 * Una riga dell'elenco: si apre se ci si è già dentro, si entra se no.
 *
 * `entraInAulaStudio` non era chiamata da nessun client: esisteva il titolo di
 * ammissione e non esisteva il gesto per usarlo.
 */
function RigaAula({ aula }: { aula: AulaStudioDto }) {
  const t = useTranslations('app.gruppo');
  const router = useRouter();

  const entra = useApiMutation({
    mutationFn: () => entraInAulaStudio(aula.id),
    invalida: [getElencaAuleStudioQueryKey() as never],
    onSuccess: () => router.push(percorsiApp.aulaStudio(aula.id)),
  });

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Icona nome="aule" dimensione={18} className="text-testo-debole" />
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-testo">{aula.titolo}</span>

      {aula.sonoPartecipante ? (
        <Link
          href={percorsiApp.aulaStudio(aula.id)}
          className="flex-none text-[12.5px] font-extrabold text-primario-collegamento"
        >
          {t('apriAula')}
        </Link>
      ) : (
        <Button
          variante="tenue"
          className="h-9 flex-none rounded-[11px] px-3 text-[12.5px]"
          inCaricamento={entra.isPending}
          onPress={() => entra.mutate(undefined)}
        >
          {t('entraAula')}
        </Button>
      )}
    </div>
  );
}

function EliminaGruppo({ gruppoId }: { gruppoId: string }) {
  const t = useTranslations('app.gruppo');
  const tComune = useTranslations('comune');
  const router = useRouter();
  const [confermaAperta, setConfermaAperta] = useState(false);

  const elimina = useApiMutation({
    mutationFn: () => eliminaGruppo(gruppoId),
    invalida: [getElencaMieiGruppiQueryKey() as never],
    onSuccess: () => router.push(percorsiApp.gruppi()),
  });

  return (
    <Card padding="md" className="border-tinta-rosa-bordo">
      <p className="text-[15px] font-extrabold text-testo">{t('elimina')}</p>
      <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-testo-tenue">{t('eliminaTesto')}</p>

      {confermaAperta ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variante="contorno"
            className="h-10 rounded-xl px-4 text-[13px]"
            onPress={() => setConfermaAperta(false)}
          >
            {tComune('annulla')}
          </Button>
          <Button
            className="h-10 rounded-xl px-4 text-[13px]"
            inCaricamento={elimina.isPending}
            onPress={() => elimina.mutate(undefined)}
          >
            {t('elimina')}
          </Button>
        </div>
      ) : (
        <Button
          variante="contorno"
          className="h-10 rounded-xl px-4 text-[13px]"
          onPress={() => setConfermaAperta(true)}
        >
          {t('elimina')}
        </Button>
      )}
    </Card>
  );
}

function EtichettaSezione({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-testo-debole">
      {children}
    </p>
  );
}
