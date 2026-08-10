import { View } from 'react-native';
import { router } from 'expo-router';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Button, Screen, Text } from '@/components/ui';

/**
 * Richiesta delle notifiche, spiegata prima di chiederla.
 *
 * Il dialogo di sistema si può mostrare una volta sola: se arriva a freddo e
 * l'utente rifiuta, non si può più chiedere. Questa schermata spiega cosa
 * cambia e lascia dire "non ora" senza bruciare la richiesta di sistema.
 */
export default function SchermataNotifiche() {
  const tema = useTema();
  const t = useT();

  const vantaggi = [
    t('app.impostazioni.notifiche.commenti'),
    t('app.impostazioni.notifiche.inviti'),
    t('app.impostazioni.notifiche.promemoria'),
  ];

  return (
    <Screen scorrevole>
      <View
        style={{
          height: 220,
          borderRadius: tema.raggio['3xl'],
          backgroundColor: tema.colori.primarioTenue,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variante="didascalia" colore="primario" allineamento="center">
          ILLUSTRAZIONE
        </Text>
      </View>

      <Text variante="titoloGrande" style={{ fontSize: 29 }}>
        {t('app.impostazioni.notifiche.commenti')}
      </Text>
      <Text variante="corpoTenue">{t('app.onboarding.privacy')}</Text>

      <View style={{ gap: tema.spaziatura[3] }}>
        {vantaggi.map((vantaggio) => (
          <View
            key={vantaggio}
            style={{ flexDirection: 'row', gap: tema.spaziatura[3], alignItems: 'flex-start' }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: tema.raggio.full,
                backgroundColor: tema.colori.primarioTenue,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: tema.colori.primarioTesto, fontWeight: '800', fontSize: 13 }}>
                ✓
              </Text>
            </View>
            <Text variante="corpo" style={{ flex: 1, fontSize: 13.5 }}>
              {vantaggio}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: tema.spaziatura[2], marginTop: 'auto' }}>
        <Button
          titolo={t('app.impostazioni.notifiche.commenti')}
          dimensione="lg"
          larghezzaPiena
          onPress={() => router.replace(rotte.bacheca())}
        />
        <Button
          titolo={t('comune.chiudi')}
          variante="fantasma"
          larghezzaPiena
          onPress={() => router.replace(rotte.bacheca())}
        />
      </View>
    </Screen>
  );
}
