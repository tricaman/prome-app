import { ActivityIndicator, View } from 'react-native';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Text } from '@/components/ui';

/** Attesa dichiarata: uno spazio riservato con un motivo, non una schermata vuota. */
export function LoadingState({ messaggio }: { messaggio?: string }) {
  const tema = useTema();
  const t = useT();

  return (
    <View
      accessibilityRole="progressbar"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tema.spaziatura[3],
        minHeight: 200,
      }}
    >
      <ActivityIndicator color={tema.colori.primario} />
      <Text variante="corpoTenue">{messaggio ?? t('comune.caricamento')}</Text>
    </View>
  );
}
