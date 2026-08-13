import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as SelettoreFile from 'expo-document-picker';
import { caricaConAvanzamento, pesoLeggibile, tipoAllegatoDa } from '@prome/app-core';
import {
  getElencaPostQueryKey,
  preautorizzaAllegato,
  pubblicaPost,
} from '@prome/api-client';
import { LUNGHEZZA_MASSIMA_POST } from '@prome/contracts';
import { UTENTE } from '@prome/contenuti';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Avatar, Button, Icona, Input, Screen, Text } from '@/components/ui';

interface AllegatoInCorso {
  id: string;
  nome: string;
  peso: string;
  avanzamento: number;
  chiave?: string;
  errore?: string;
}

/**
 * Composizione di un post.
 *
 * Il limite di caratteri è visibile mentre si scrive, non scoperto al momento
 * dell'invio: cinquemila caratteri sono tanti, ma chi incolla appunti li
 * supera, e vederlo dopo aver scritto è la cosa più frustrante che ci sia.
 *
 * Il file parte appena scelto, così quando si preme «Pubblica» non c'è quasi
 * nulla da aspettare; e finché un caricamento è a metà il bottone resta
 * spento, perché pubblicare allora citerebbe una chiave senza byte.
 */
export default function SchermataComponi() {
  const tema = useTema();
  const t = useT();
  const [testo, setTesto] = useState('');
  const [allegati, setAllegati] = useState<AllegatoInCorso[]>([]);
  const prossimoId = useRef(0);

  const troppoLungo = testo.length > LUNGHEZZA_MASSIMA_POST;
  const caricamentoInCorso = allegati.some((a) => !a.chiave && !a.errore);

  const pubblica = useApiMutation({
    mutationFn: () =>
      pubblicaPost({
        testo,
        allegati: allegati.map((a) => a.chiave).filter((c): c is string => Boolean(c)),
      }),
    invalida: [getElencaPostQueryKey()],
    onSuccess: () => router.back(),
  });

  const puoPubblicare =
    testo.trim().length > 0 && !troppoLungo && !caricamentoInCorso && !pubblica.isPending;

  const aggiorna = (id: string, modifiche: Partial<AllegatoInCorso>) =>
    setAllegati((correnti) => correnti.map((a) => (a.id === id ? { ...a, ...modifiche } : a)));

  const scegliFile = async () => {
    const esito = await SelettoreFile.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'text/*'],
      copyToCacheDirectory: true,
    });
    if (esito.canceled) return;

    const scelto = esito.assets[0];
    if (!scelto) return;

    const id = `allegato-${(prossimoId.current += 1)}`;
    const tipo = tipoAllegatoDa(scelto.mimeType);
    const dimensione = scelto.size ?? 0;

    if (!tipo) {
      setAllegati((correnti) => [
        ...correnti,
        { id, nome: scelto.name, peso: '', avanzamento: 0, errore: t('app.feed.tipoNonAmmesso') },
      ]);
      return;
    }

    setAllegati((correnti) => [
      ...correnti,
      { id, nome: scelto.name, peso: pesoLeggibile(dimensione), avanzamento: 0 },
    ]);

    try {
      const { data } = await preautorizzaAllegato({ nome: scelto.name, tipo, dimensione });
      await caricaConAvanzamento({
        url: data.url,
        // Su React Native il corpo è il riferimento al file locale: i byte non
        // vengono letti in memoria, li legge il livello nativo mentre invia.
        corpo: { uri: scelto.uri, name: scelto.name, type: scelto.mimeType ?? 'application/octet-stream' },
        intestazioni: { 'content-type': scelto.mimeType ?? 'application/octet-stream' },
        onAvanzamento: (percentuale) => aggiorna(id, { avanzamento: percentuale }),
      });
      aggiorna(id, { chiave: data.chiave, avanzamento: 100 });
    } catch {
      // Il messaggio del server arriva già tradotto dall'avviso automatico:
      // qui resta la riga in errore, che dice *quale* file non è passato.
      aggiorna(id, { errore: t('app.feed.caricamentoFallito') });
    }
  };

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          padding: tema.spaziatura[4],
          borderBottomWidth: 1,
          borderBottomColor: tema.colori.bordo,
          backgroundColor: tema.colori.superficie,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('comune.chiudi')}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Icona nome="chiudi" dimensione={24} colore="testo" />
        </Pressable>
        <Text variante="sottotitolo" style={{ flex: 1 }}>
          {t('app.nuovoPost')}
        </Text>
        <Button
          titolo={t('app.feed.pubblica')}
          disabled={!puoPubblicare}
          inCaricamento={pubblica.isPending}
          onPress={() => pubblica.mutate(undefined)}
        />
      </View>

      <Screen scorrevole>
        <View style={{ flexDirection: 'row', gap: tema.spaziatura[3] }}>
          <Avatar nome={UTENTE.nome} dimensione={40} />
          <View style={{ flex: 1 }}>
            <Text variante="etichetta">{UTENTE.nome}</Text>
            <Text variante="didascalia">{UTENTE.corso}</Text>
          </View>
        </View>

        <Input
          value={testo}
          onChangeText={setTesto}
          placeholder={t('app.feed.composer', { nome: UTENTE.nome.split(' ')[0] ?? '' })}
          righe={8}
          massimoCaratteri={LUNGHEZZA_MASSIMA_POST}
          errore={
            troppoLungo
              ? t('validazione.testoTroppoLungo', { max: LUNGHEZZA_MASSIMA_POST })
              : undefined
          }
          autoFocus
        />

        {allegati.map((allegato) => (
          <RigaAllegato
            key={allegato.id}
            allegato={allegato}
            onTogli={() => setAllegati((correnti) => correnti.filter((a) => a.id !== allegato.id))}
          />
        ))}

        <View style={{ flexDirection: 'row', gap: tema.spaziatura[3] }}>
          <Button
            titolo={t('app.sala.caricaMateriale')}
            variante="contorno"
            iconaSinistra={<Icona nome="carica" dimensione={18} colore="testo" />}
            onPress={() => void scegliFile()}
          />
        </View>

        <Text variante="didascalia">
          {t('app.sala.conteggioFile', { numero: allegati.filter((a) => a.chiave).length })}
        </Text>
      </Screen>
    </>
  );
}

/** Una riga per file: nome, peso, avanzamento, e come toglierlo. */
function RigaAllegato({
  allegato,
  onTogli,
}: {
  allegato: AllegatoInCorso;
  onTogli: () => void;
}) {
  const tema = useTema();
  const t = useT();
  const completo = Boolean(allegato.chiave);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        backgroundColor: tema.colori.superficieAlt,
        borderRadius: tema.raggio.lg,
        borderWidth: 1,
        borderColor: tema.colori.bordo,
        padding: tema.spaziatura[3],
      }}
    >
      <Icona nome={allegato.errore ? 'chiudi' : 'carica'} dimensione={18} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variante="etichetta" numberOfLines={1}>
          {allegato.nome}
        </Text>
        {allegato.errore ? (
          <Text variante="didascalia" style={{ color: tema.colori.errore }}>
            {allegato.errore}
          </Text>
        ) : (
          <>
            <Text variante="didascalia">{allegato.peso}</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ now: allegato.avanzamento, min: 0, max: 100 }}
              style={{
                height: 6,
                borderRadius: tema.raggio.full,
                backgroundColor: tema.colori.superficieAlt2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${allegato.avanzamento}%`,
                  height: '100%',
                  backgroundColor: completo ? tema.colori.primario : tema.colori.primarioTenue,
                }}
              />
            </View>
          </>
        )}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('comune.elimina')} onPress={onTogli} hitSlop={8}>
        <Icona nome="chiudi" dimensione={18} />
      </Pressable>
    </View>
  );
}
