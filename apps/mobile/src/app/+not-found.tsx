import { router } from 'expo-router';
import { useT } from '@/hooks';
import { Button, Screen, Text } from '@/components/ui';

/** Percorso inesistente: sempre meglio di una schermata vuota senza uscita. */
export default function SchermataNonTrovata() {
  const t = useT();

  return (
    <Screen centrato>
      <Text variante="titolo" allineamento="center">
        {t('errori.nonTrovato.titolo')}
      </Text>
      <Text variante="corpoTenue" allineamento="center">
        {t('errori.nonTrovato.descrizione')}
      </Text>
      <Button
        titolo={t('errori.nonTrovato.azione')}
        variante="primaria"
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}
