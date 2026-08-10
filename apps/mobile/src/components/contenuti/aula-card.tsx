import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import type { AulaDiSessione, AulaProgrammata } from '@prome/contenuti';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { AvatarGroup, Card, Chip, Text } from '@/components/ui';

/**
 * Aula studio in corso.
 *
 * Lo stato viene prima del titolo perché è quello che decide se si può fare
 * qualcosa adesso; il richiamo "Entra" è largo quanto serve al pollice.
 */
export function AulaCard({ aula }: { aula: AulaDiSessione }) {
  const tema = useTema();
  const t = useT();

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(rotte.aula(aula.id))}>
      <Card style={{ gap: tema.spaziatura[2] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tema.spaziatura[2] }}>
          <Chip tono="menta" indicatore>
            {t('pagine.aula.inCorso')}
          </Chip>
          <Chip>{aula.visibilita}</Chip>
          {aula.gruppo ? <Chip>{aula.gruppo}</Chip> : null}
        </View>

        <Text variante="sottotitolo">{aula.titolo}</Text>
        <Text variante="didascalia">{aula.contesto}</Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tema.spaziatura[3],
            marginTop: tema.spaziatura[1],
          }}
        >
          <AvatarGroup nomi={['Giulia Ferrari', 'Luca Bianchi', 'Sara Conti']} />
          <Text variante="didascalia" style={{ flex: 1 }}>
            {aula.partecipanti}
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
  aula: AulaProgrammata;
  ultima?: boolean;
}) {
  const tema = useTema();
  const t = useT();

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
        <Text variante="sottotitolo">{aula.giorno}</Text>
        <Text variante="didascalia" style={{ fontSize: 10.5, letterSpacing: 0.5 }}>
          {aula.mese}
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
          {aula.contesto}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text variante="etichetta">{aula.ora}</Text>
        <Text variante="didascalia" colore="primario" style={{ fontWeight: '800' }}>
          {t('app.aule.avvisami')}
        </Text>
      </View>
    </Pressable>
  );
}
