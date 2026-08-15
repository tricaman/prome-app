import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { AulaStudioDto } from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Card, Chip, Text } from '@/components/ui';

/**
 * Aula studio in corso.
 *
 * Lo stato viene prima del titolo perché è quello che decide se si può fare
 * qualcosa adesso; il richiamo "Entra" è largo quanto serve al pollice.
 */
export function AulaCard({ aula }: { aula: AulaStudioDto }) {
  const tema = useTema();
  const t = useT();

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(rotte.aula(aula.id))}>
      <Card style={{ gap: tema.spaziatura[2] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
          <Chip tono="menta" indicatore>
            {t('pagine.aula.inCorso')}
          </Chip>
          <Chip>{leggibile(aula.visibilita)}</Chip>
          {aula.ateneo ? <Chip>{aula.ateneo}</Chip> : null}
        </View>

        <Text variante="sottotitolo">{aula.titolo}</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tema.spaziatura[3],
            marginTop: tema.spaziatura[1],
          }}
        >
          <Text variante="didascalia" style={{ flex: 1 }}>
            {aula.partecipanti === 1
              ? t('app.sala.unPartecipante')
              : t('app.sala.nPartecipanti', { numero: aula.partecipanti })}
          </Text>
          <Chip tono="menta">{t('app.aule.entra')}</Chip>
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * Aula studio programmata, in forma di riga con la data in evidenza: in un
 * elenco di appuntamenti il giorno è la prima cosa che si cerca.
 */
export function AulaProgrammataRiga({
  aula,
  ultima = false,
}: {
  aula: AulaStudioDto;
  ultima?: boolean;
}) {
  const tema = useTema();
  const quando = new Date(aula.dataOraInizio!);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(rotte.aula(aula.id))}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[4],
        paddingVertical: tema.spaziatura[4],
        paddingHorizontal: tema.spaziatura[4],
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: tema.colori.superficieAlt2,
      }}
    >
      <View style={{ width: 46, alignItems: 'center' }}>
        <Text variante="sottotitolo">{quando.getDate()}</Text>
        <Text variante="didascalia" style={{ fontSize: 10.5, letterSpacing: 0.5 }}>
          {quando.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
        </Text>
      </View>
      <View
        style={{ width: 1, height: 34, backgroundColor: tema.colori.bordo }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variante="etichetta" numberOfLines={1}>
          {aula.titolo}
        </Text>
        <Text variante="didascalia" numberOfLines={1}>
          {leggibile(aula.visibilita)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text variante="etichetta">
          {quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Pressable>
  );
}

/** «PRIVATO» non si mostra a nessuno: si scrive come si legge. */
const leggibile = (visibilita: string) =>
  visibilita.charAt(0) + visibilita.slice(1).toLowerCase();
