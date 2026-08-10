import { View } from 'react-native';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Button, Text } from '@/components/ui';

export interface EmptyStateProps {
  titolo?: string;
  descrizione?: string;
  azione?: { etichetta: string; onPress: () => void };
}

/** "Qui non c'è ancora nulla", detto in modo utile. */
export function EmptyState({ titolo, descrizione, azione }: EmptyStateProps) {
  const tema = useTema();
  const t = useT();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tema.spaziatura[3],
        paddingVertical: tema.spaziatura[12],
        minHeight: 200,
      }}
    >
      <Text variante="sottotitolo" allineamento="center">
        {titolo ?? t('errori.vuoto.titolo')}
      </Text>
      <Text variante="corpoTenue" allineamento="center">
        {descrizione ?? t('errori.vuoto.descrizione')}
      </Text>
      {azione ? (
        <Button titolo={azione.etichetta} onPress={azione.onPress} variante="primaria" />
      ) : null}
    </View>
  );
}
