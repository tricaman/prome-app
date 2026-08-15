import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  creaGruppo,
  getElencaMieiGruppiQueryKey,
  useLeggiMioProfilo,
  type CreaGruppoDtoVisibilita,
} from '@prome/api-client';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Button, Icona, Input, Screen, Text } from '@/components/ui';
import { SceltaVisibilitaGruppo } from '@/components/app/scelta-visibilita-gruppo';

/**
 * Creare un gruppo dal telefono.
 *
 * Un gruppo è un contenitore di persone: nome e visibilità, e nient'altro da
 * decidere. Chi lo crea ne è moderatore dalla stessa scrittura (G4), quindi
 * non esiste l'istante in cui il gruppo c'è e nessuno può amministrarlo.
 *
 * Si entra **per invito**, sempre: «pubblico» dice chi può vedere il gruppo, non
 * chi può entrarci da solo.
 */
export default function SchermataCreaGruppo() {
  const tema = useTema();
  const t = useT();

  const [nome, setNome] = useState('');
  const [visibilita, setVisibilita] = useState<CreaGruppoDtoVisibilita>('PRIVATO');
  const profilo = useLeggiMioProfilo();

  const crea = useApiMutation({
    mutationFn: () => creaGruppo({ nome: nome.trim(), visibilita }),
    invalida: [getElencaMieiGruppiQueryKey() as never],
    onSuccess: ({ data }) => router.replace(rotte.gruppo(data.id)),
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
          {t('app.gruppo.crea')}
        </Text>
        <Button
          titolo={t('comune.salva')}
          disabled={!nome.trim()}
          inCaricamento={crea.isPending}
          onPress={() => crea.mutate(undefined)}
        />
      </View>

      <Screen scorrevole>
        <Input
          etichetta={t('app.gruppo.nome')}
          placeholder={t('app.gruppo.nomeEsempio')}
          value={nome}
          onChangeText={setNome}
        />

        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="etichetta">{t('app.gruppo.chiPuoVederlo')}</Text>
          <SceltaVisibilitaGruppo
            valore={visibilita}
            onScegli={setVisibilita}
            senzaAteneo={!profilo.data?.data.universita}
          />
        </View>
      </Screen>
    </View>
  );
}
