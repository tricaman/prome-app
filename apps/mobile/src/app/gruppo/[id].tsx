import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  eliminaGruppo,
  entraInAulaStudio,
  getElencaAuleStudioQueryKey,
  getElencaMieiGruppiQueryKey,
  getLeggiGruppoQueryKey,
  invitaNelGruppo,
  modificaGruppo,
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
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { QueryBoundary } from '@/components/feedback';
import { Avatar, Button, Card, Chip, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';
import { etichettaVisibilita } from '@/lib/visibilita';
import { SceltaVisibilitaGruppo } from '@/components/app/scelta-visibilita-gruppo';

/**
 * Un gruppo visto da dentro, dal telefono.
 *
 * È superficie su regole già definite altrove: **nessuna verifica viene
 * ricopiata qui**. G2 la fa rispettare il server — l'ultimo moderatore non si
 * rimuove né si retrocede — e il messaggio arriva già tradotto. L'unica cosa
 * che questa schermata fa è **non offrire** ciò che sarebbe rifiutato: i gesti
 * di moderazione a chi non modera, e la visibilità di ateneo a un gruppo nato
 * senza ateneo.
 */
export default function SchermataGruppo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gruppo = useLeggiGruppo(id);

  return (
    <View style={{ flex: 1 }}>
      <Intestazione conIndietro />
      <QueryBoundary query={gruppo}>
        {({ data }) => <Contenuto gruppoId={id} dettaglio={data} />}
      </QueryBoundary>
    </View>
  );
}

function Contenuto({
  gruppoId,
  dettaglio,
}: {
  gruppoId: string;
  dettaglio: DettaglioGruppoDto;
}) {
  const tema = useTema();
  const t = useT();
  const { gruppo, membri } = dettaglio;
  const io = useLeggiMioProfilo();
  const mioId = io.data?.data.utenteId;
  const unicoModeratore = membri.filter((m) => m.moderatore).length === 1;

  return (
    <Screen scorrevole>
      <Card style={{ gap: tema.spaziatura[2] }}>
        <Text variante="titolo">{gruppo.nome}</Text>
        <Text variante="didascalia">
          {gruppo.membri === 1
            ? t('app.gruppo.unMembro')
            : t('app.gruppo.nMembri', { numero: gruppo.membri })}
          {gruppo.ateneo ? ` · ${gruppo.ateneo}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
          <Chip>{t(`app.gruppo.visibilita.${etichettaVisibilita(gruppo.visibilita)}`)}</Chip>
          {gruppo.sonoModeratore ? <Chip tono="menta">{t('app.gruppo.moderatore')}</Chip> : null}
        </View>
      </Card>

      {gruppo.sonoModeratore ? <Impostazioni gruppo={gruppo} /> : null}
      {gruppo.sonoModeratore ? <Invito gruppoId={gruppoId} /> : null}

      <Text variante="etichetta">
        {gruppo.membri === 1
          ? t('app.gruppo.unMembro')
          : t('app.gruppo.nMembri', { numero: gruppo.membri })}
      </Text>
      <View style={{ gap: tema.spaziatura[3] }}>
        {membri.map((membro) => (
          <RigaMembro
            key={membro.utenteId}
            gruppoId={gruppoId}
            membro={membro}
            sonoModeratore={gruppo.sonoModeratore}
            sonoIo={membro.utenteId === mioId}
            unicoModeratore={unicoModeratore}
          />
        ))}
      </View>

      <AuleDelGruppo gruppoId={gruppoId} />

      {gruppo.sonoModeratore ? <Elimina gruppoId={gruppoId} /> : null}
    </Screen>
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
  const tema = useTema();
  const t = useT();

  const nome = [membro.nome, membro.cognome].filter(Boolean).join(' ');
  const etichetta = membro.rimosso ? t('comune.utenteRimosso') : nome || t('comune.utenteRimosso');

  // G2 vale anche a schermo: all'unico moderatore non si offre di togliersi il
  // ruolo né di uscire, e gli si dice perché invece di lasciarlo provare.
  const bloccatoDaG2 = membro.moderatore && unicoModeratore;

  const invalida = [
    getLeggiGruppoQueryKey(gruppoId) as never,
    getElencaMieiGruppiQueryKey() as never,
  ];

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
      if (sonoIo) router.replace(rotte.gruppi());
    },
  });

  const inCorso = promuovi.isPending || retrocedi.isPending || rimuovi.isPending;

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
        <Avatar nome={etichetta} dimensione={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variante="etichetta" numberOfLines={1}>
            {etichetta}
          </Text>
          <Text variante="didascalia">
            {membro.moderatore ? t('app.gruppo.moderatore') : (membro.universita ?? '')}
          </Text>
        </View>
      </View>

      {sonoModeratore || sonoIo ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
          {sonoModeratore && !membro.moderatore ? (
            <Button
              titolo={t('app.gruppo.promuovi')}
              variante="contorno"
              disabled={inCorso}
              onPress={() => promuovi.mutate(undefined)}
            />
          ) : null}

          {sonoModeratore && membro.moderatore && !bloccatoDaG2 ? (
            <Button
              titolo={t('app.gruppo.retrocedi')}
              variante="contorno"
              disabled={inCorso}
              onPress={() => retrocedi.mutate(undefined)}
            />
          ) : null}

          {!bloccatoDaG2 ? (
            <Button
              titolo={sonoIo ? t('app.gruppo.esci') : t('app.gruppo.rimuovi')}
              variante="fantasma"
              disabled={inCorso}
              onPress={() => rimuovi.mutate(undefined)}
            />
          ) : null}

          {bloccatoDaG2 && sonoIo ? (
            <Text variante="didascalia">{t('app.gruppo.ultimoModeratore')}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Nome e visibilità. L'ateneo non c'è: è congelato alla creazione (G5). */
function Impostazioni({ gruppo }: { gruppo: GruppoDto }) {
  const tema = useTema();
  const t = useT();
  const [nome, setNome] = useState(gruppo.nome);
  const [visibilita, setVisibilita] = useState(gruppo.visibilita);

  const salva = useApiMutation({
    mutationFn: () => modificaGruppo(gruppo.id, { nome: nome.trim(), visibilita }),
    invalida: [
      getLeggiGruppoQueryKey(gruppo.id) as never,
      getElencaMieiGruppiQueryKey() as never,
    ],
  });

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <Text variante="etichetta">{t('app.gruppo.impostazioni')}</Text>
      <Input etichetta={t('app.gruppo.nome')} value={nome} onChangeText={setNome} />

      <Text variante="etichetta">{t('app.gruppo.chiPuoVederlo')}</Text>
      <SceltaVisibilitaGruppo
        valore={visibilita}
        onScegli={setVisibilita}
        senzaAteneo={!gruppo.ateneo}
      />

      <Button
        titolo={t('app.gruppo.salva')}
        variante="contorno"
        larghezzaPiena
        disabled={!nome.trim()}
        inCaricamento={salva.isPending}
        onPress={() => salva.mutate(undefined)}
      />
    </Card>
  );
}

function Invito({ gruppoId }: { gruppoId: string }) {
  const tema = useTema();
  const t = useT();
  const [destinatario, setDestinatario] = useState('');

  const invita = useApiMutation({
    mutationFn: () => invitaNelGruppo(gruppoId, { destinatario: destinatario.trim() }),
    onSuccess: () => setDestinatario(''),
  });

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ gap: 4 }}>
        <Text variante="etichetta">{t('app.gruppo.invita')}</Text>
        <Text variante="didascalia">{t('app.gruppo.invitaTesto')}</Text>
      </View>
      <Input
        etichetta={t('app.gruppo.indirizzo')}
        placeholder="compagno@studenti.unibo.it"
        value={destinatario}
        onChangeText={setDestinatario}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Button
        titolo={t('app.gruppo.invita')}
        variante="contorno"
        larghezzaPiena
        disabled={!destinatario.includes('@')}
        inCaricamento={invita.isPending}
        onPress={() => invita.mutate(undefined)}
      />
    </Card>
  );
}

/**
 * Le aule collocate qui.
 *
 * Le chiede al contesto che le possiede: il gruppo non conosce le aule. Chi è
 * del gruppo le vede tutte, comprese quelle in cui non è ancora entrato — è
 * esattamente ciò che la collocazione gli concede, e senza questo elenco non
 * avrebbe modo di usarlo.
 */
function AuleDelGruppo({ gruppoId }: { gruppoId: string }) {
  const tema = useTema();
  const t = useT();
  const aule = useElencaAuleStudio({ gruppoId, limit: 50 });

  return (
    <>
      <Text variante="etichetta">{t('app.gruppo.aule')}</Text>
      <QueryBoundary
        query={aule}
        caricamento={<View />}
        eVuoto={(risposta) => risposta.data.length === 0}
        vuoto={
          <Card style={{ gap: 4 }}>
            <Text variante="didascalia">{t('app.gruppo.nessunAula')}</Text>
            <Text variante="didascalia">{t('app.gruppo.collocaTesto')}</Text>
          </Card>
        }
      >
        {(risposta) => (
          <View style={{ gap: tema.spaziatura[3] }}>
            {risposta.data.map((aula) => (
              <RigaAula key={aula.id} aula={aula} />
            ))}
          </View>
        )}
      </QueryBoundary>
    </>
  );
}

function RigaAula({ aula }: { aula: AulaStudioDto }) {
  const tema = useTema();
  const t = useT();

  const entra = useApiMutation({
    mutationFn: () => entraInAulaStudio(aula.id),
    invalida: [getElencaAuleStudioQueryKey() as never],
    onSuccess: () => router.push(rotte.aula(aula.id)),
  });

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: tema.spaziatura[3] }}>
      <Icona nome="aule" dimensione={18} colore="debole" />
      <Text variante="etichetta" style={{ flex: 1 }} numberOfLines={1}>
        {aula.titolo}
      </Text>
      <Button
        titolo={aula.sonoPartecipante ? t('app.gruppo.apriAula') : t('app.gruppo.entraAula')}
        variante="contorno"
        inCaricamento={entra.isPending}
        onPress={() =>
          aula.sonoPartecipante ? router.push(rotte.aula(aula.id)) : entra.mutate(undefined)
        }
      />
    </Card>
  );
}

function Elimina({ gruppoId }: { gruppoId: string }) {
  const tema = useTema();
  const t = useT();
  const [conferma, setConferma] = useState(false);

  const elimina = useApiMutation({
    mutationFn: () => eliminaGruppo(gruppoId),
    invalida: [getElencaMieiGruppiQueryKey() as never],
    onSuccess: () => router.replace(rotte.gruppi()),
  });

  return (
    <Card style={{ gap: tema.spaziatura[2] }}>
      <Text variante="etichetta">{t('app.gruppo.elimina')}</Text>
      <Text variante="didascalia">{t('app.gruppo.eliminaTesto')}</Text>
      {conferma ? (
        <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
          <Button
            titolo={t('comune.annulla')}
            variante="contorno"
            onPress={() => setConferma(false)}
          />
          <Button
            titolo={t('app.gruppo.elimina')}
            variante="distruttiva"
            inCaricamento={elimina.isPending}
            onPress={() => elimina.mutate(undefined)}
          />
        </View>
      ) : (
        <Button
          titolo={t('app.gruppo.elimina')}
          variante="contorno"
          larghezzaPiena
          onPress={() => setConferma(true)}
        />
      )}
    </Card>
  );
}
