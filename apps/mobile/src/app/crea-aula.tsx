import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  creaAulaStudio,
  getElencaAuleStudioQueryKey,
  useElencaMieiGruppi,
  useLeggiMioProfilo,
  type CreaAulaStudioDtoVisibilita,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Button, Card, Icona, Input, Screen, Text } from '@/components/ui';

const VISIBILITA: readonly {
  valore: CreaAulaStudioDtoVisibilita;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', chiave: 'privato' },
  { valore: 'ATENEO', chiave: 'ateneo' },
  { valore: 'PUBBLICO', chiave: 'pubblico' },
];

/**
 * Aprire un'aula studio dal telefono.
 *
 * Era la voce mancante di E11.1 («lista, creazione, dettaglio, partecipanti»):
 * dalla scheda delle aule si poteva solo guardare l'elenco, e **chi ha soltanto
 * il telefono non poteva aprire un'aula**.
 *
 * **Qui l'aula nasce estemporanea**, cioè senza data di inizio, e non è una
 * mutilazione: AS8 stabilisce che la sola differenza fra un'aula programmata e
 * una estemporanea è la presenza di quella data, e che la data **non apre né
 * chiude nulla**. Un selettore di data nativo sarebbe un modulo in più e una
 * ricostruzione del dev client per un campo che non cambia il comportamento
 * dell'aula: programmare resta un gesto del web, e la schermata lo dice.
 */
export default function SchermataCreaAula() {
  const tema = useTema();
  const t = useT();

  const [titolo, setTitolo] = useState('');
  const [visibilita, setVisibilita] = useState<CreaAulaStudioDtoVisibilita>('PRIVATO');
  const [gruppoId, setGruppoId] = useState('');

  const profilo = useLeggiMioProfilo();
  // Solo i gruppi di cui si fa parte: l'API esige l'appartenenza per collocare
  // un'aula, quindi proporne altri sarebbe un rifiuto annunciato.
  const gruppi = useElencaMieiGruppi({ limit: 50 });
  const gruppiMiei = gruppi.data?.data ?? [];

  const apri = useApiMutation({
    mutationFn: () =>
      creaAulaStudio({
        titolo: titolo.trim(),
        visibilita,
        ...(gruppoId ? { gruppoId } : {}),
      }),
    invalida: [getElencaAuleStudioQueryKey() as never],
    onSuccess: ({ data }) => router.replace(rotte.aula(data.id)),
  });

  return (
    <View style={{ flex: 1, backgroundColor: tema.colori.sfondo }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tema.spaziatura[3],
          paddingHorizontal: tema.spaziatura[5],
          paddingVertical: tema.spaziatura[3],
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
          {t('app.aule.modale.titolo')}
        </Text>
        <Button
          titolo={t('app.aule.modale.apri')}
          disabled={!titolo.trim()}
          inCaricamento={apri.isPending}
          onPress={() => apri.mutate(undefined)}
        />
      </View>

      <Screen scorrevole>
        <Input
          etichetta={t('app.aule.modale.campoTitolo')}
          placeholder={t('app.aule.modale.segnaposto')}
          value={titolo}
          onChangeText={setTitolo}
        />

        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="etichetta">{t('app.aule.modale.chiPuoEntrare')}</Text>
          {VISIBILITA.map((opzione) => {
            // Senza un'università nel profilo, «Ateneo» darebbe un'aula
            // riservata a un ateneo che non c'è: visibile a nessuno.
            const impossibile =
              opzione.valore === 'ATENEO' && !profilo.data?.data.universita;
            const scelta = opzione.valore === visibilita;

            return (
              <Pressable
                key={opzione.valore}
                accessibilityRole="radio"
                accessibilityState={{ selected: scelta, disabled: impossibile }}
                disabled={impossibile}
                onPress={() => setVisibilita(opzione.valore)}
                style={{
                  borderRadius: tema.raggio.lg,
                  borderWidth: 2,
                  borderColor: scelta ? tema.colori.primario : tema.colori.bordo,
                  backgroundColor: scelta ? tema.colori.primarioTenue : tema.colori.superficie,
                  padding: tema.spaziatura[3],
                  gap: 3,
                  opacity: impossibile ? 0.5 : 1,
                }}
              >
                <Text
                  variante="etichetta"
                  style={{ color: scelta ? tema.colori.primarioTesto : tema.colori.testo }}
                >
                  {t(`app.aule.modale.visibilita.${opzione.chiave}Titolo`)}
                </Text>
                <Text variante="didascalia">
                  {t(`app.aule.modale.visibilita.${opzione.chiave}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {gruppiMiei.length ? (
          <View style={{ gap: tema.spaziatura[2] }}>
            <Text variante="etichetta">{t('app.aule.modale.colloca')}</Text>
            <Text variante="didascalia">{t('app.aule.modale.collocaAiuto')}</Text>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: !gruppoId }}
              onPress={() => setGruppoId('')}
              style={rigaGruppo(tema, !gruppoId)}
            >
              <Text variante="corpo" style={{ fontSize: 14 }}>
                {t('app.aule.modale.nessuno')}
              </Text>
            </Pressable>

            {gruppiMiei.map((gruppo) => (
              <Pressable
                key={gruppo.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: gruppoId === gruppo.id }}
                onPress={() => setGruppoId(gruppo.id)}
                style={rigaGruppo(tema, gruppoId === gruppo.id)}
              >
                <Text variante="corpo" style={{ fontSize: 14 }} numberOfLines={1}>
                  {gruppo.nome}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Card style={{ gap: 4 }}>
          <Text variante="didascalia">{t('app.aule.modale.senzaData')}</Text>
        </Card>
      </Screen>
    </View>
  );
}

const rigaGruppo = (tema: ReturnType<typeof useTema>, scelto: boolean) => ({
  borderRadius: tema.raggio.lg,
  borderWidth: 2,
  borderColor: scelto ? tema.colori.primario : tema.colori.bordo,
  backgroundColor: scelto ? tema.colori.primarioTenue : tema.colori.superficie,
  paddingHorizontal: tema.spaziatura[3],
  paddingVertical: tema.spaziatura[3],
});
