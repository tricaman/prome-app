import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ATENEI } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { completaMioProfilo, type CompletaProfiloDto } from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { Button, Card, Icona, Input, Intestazione, Screen, Text } from '@/components/ui';

const PASSI_TOTALI = 3;

/**
 * Onboarding del profilo, in tre passi.
 *
 * Una domanda per schermata: il passo dell'ateneo ha bisogno di spazio
 * verticale per i risultati della ricerca, e stiparlo insieme a nome e corso
 * lo renderebbe scomodo proprio dove serve precisione.
 *
 * La barra di avanzamento è continua e non una lista di spunte: comunica
 * progresso senza far sentire l'utente sotto esame.
 */
export default function SchermataProfilo() {
  const tema = useTema();
  const t = useT();
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [ricerca, setRicerca] = useState('');
  const [ateneo, setAteneo] = useState<string | null>(null);
  const [corso, setCorso] = useState('');

  const risultati = useMemo(() => {
    const termine = ricerca.trim().toLowerCase();
    const trovati = termine
      ? ATENEI.filter((voce) => voce.nome.toLowerCase().includes(termine))
      : ATENEI;
    return trovati.slice(0, 4);
  }, [ricerca]);

  const puoProseguire =
    (passo === 1 && nome.trim() && cognome.trim()) ||
    (passo === 2 && ateneo) ||
    (passo === 3 && corso.trim());

  /**
   * I passi sono tre, la scrittura è una.
   *
   * Il server considera l'onboarding completo se e solo se ci sono tutti e
   * quattro i dati, quindi non ha senso mandarli man mano: si raccolgono e si
   * scrivono insieme all'ultimo passo.
   */
  const completa = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (dati: CompletaProfiloDto) => completaMioProfilo(dati),
    onSuccess: () => router.replace(rotte.bacheca()),
  });

  const avanti = () => {
    if (passo < PASSI_TOTALI) {
      setPasso((corrente) => corrente + 1);
      return;
    }
    completa.mutate({
      nome: nome.trim(),
      cognome: cognome.trim(),
      universita: ateneo ?? '',
      corso: corso.trim(),
    });
  };

  const indietro = () => {
    if (passo > 1) setPasso((corrente) => corrente - 1);
    else router.back();
  };

  return (
    <>
      <Intestazione />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          paddingHorizontal: tema.spaziatura[5],
          paddingBottom: tema.spaziatura[3],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('app.onboarding.indietro')}
          onPress={indietro}
          style={{
            width: 40,
            height: 40,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.superficieAlt2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icona nome="indietro" colore="testo" />
        </Pressable>

        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: PASSI_TOTALI, now: passo }}
          style={{
            flex: 1,
            height: 8,
            borderRadius: tema.raggio.full,
            backgroundColor: tema.colori.bordo,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${(passo / PASSI_TOTALI) * 100}%`,
              height: '100%',
              borderRadius: tema.raggio.full,
              backgroundColor: tema.colori.primario,
            }}
          />
        </View>

        <Text variante="didascalia" style={{ fontWeight: '800' }}>
          {passo}/{PASSI_TOTALI}
        </Text>
      </View>

      <Screen scorrevole>
        {passo === 1 ? (
          <>
            <Text variante="titoloGrande" style={{ fontSize: 30 }}>
              {t('app.onboarding.titolo')}
            </Text>
            <NotaPrivacy />
            <Input etichetta="Nome" value={nome} onChangeText={setNome} obbligatorio />
            <Input etichetta="Cognome" value={cognome} onChangeText={setCognome} obbligatorio />
          </>
        ) : null}

        {passo === 2 ? (
          <>
            <Text variante="titoloGrande" style={{ fontSize: 30 }}>
              {t('app.onboarding.titolo')}
            </Text>
            <Text variante="corpoTenue">{t('app.onboarding.sommario')}</Text>
            <Input
              value={ricerca}
              onChangeText={setRicerca}
              placeholder={t('app.onboarding.cercaUniversita')}
              autoFocus
            />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {risultati.length === 0 ? (
                <View style={{ padding: tema.spaziatura[4] }}>
                  <Text variante="corpoTenue">{t('app.onboarding.nessunRisultato')}</Text>
                </View>
              ) : (
                risultati.map((voce, indice) => {
                  const scelto = voce.nome === ateneo;
                  return (
                    <Pressable
                      key={voce.slug}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: scelto }}
                      onPress={() => setAteneo(voce.nome)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: tema.spaziatura[3],
                        padding: tema.spaziatura[4],
                        backgroundColor: scelto ? tema.colori.primarioTenue : 'transparent',
                        borderBottomWidth: indice < risultati.length - 1 ? 1 : 0,
                        borderBottomColor: tema.colori.superficieAlt2,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: tema.raggio.md,
                          backgroundColor: tema.colori.primarioTenue,
                        }}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variante="etichetta" numberOfLines={1}>
                          {voce.nome}
                        </Text>
                        <Text variante="didascalia">{voce.citta}</Text>
                      </View>
                      {scelto ? (
                        <Text colore="primario" style={{ fontWeight: '800' }}>
                          ✓
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </Card>
            <Text variante="didascalia">{t('app.onboarding.nonTrovi')}</Text>
          </>
        ) : null}

        {passo === 3 ? (
          <>
            <Text variante="titoloGrande" style={{ fontSize: 30 }}>
              {t('app.onboarding.titolo')}
            </Text>
            <Text variante="corpoTenue">{t('app.onboarding.sommario')}</Text>
            <Input
              etichetta="Corso di studi"
              value={corso}
              onChangeText={setCorso}
              placeholder="Ingegneria informatica"
              obbligatorio
            />
          </>
        ) : null}
      </Screen>

      <View style={{ padding: tema.spaziatura[5], paddingTop: 0 }}>
        <Button
          titolo={t('app.onboarding.continua')}
          dimensione="lg"
          larghezzaPiena
          disabled={!puoProseguire}
          onPress={avanti}
        />
      </View>
    </>
  );
}

/** La nota sul trattamento dati sta sopra i campi: è lì che si decide se fidarsi. */
function NotaPrivacy() {
  const tema = useTema();
  const t = useT();

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: tema.spaziatura[3],
        backgroundColor: tema.colori.primarioTenue,
        borderRadius: tema.raggio.xl,
        padding: tema.spaziatura[4],
      }}
    >
      <Icona nome="lucchetto" colore="primario" />
      <Text variante="didascalia" style={{ flex: 1, color: tema.colori.primarioTesto }}>
        {t('app.onboarding.privacy')}
      </Text>
    </View>
  );
}
