import { useState } from 'react';
import { View } from 'react-native';
import {
  completaMioProfilo,
  getLeggiMioProfiloQueryKey,
  type CompletaProfiloDto,
  type ProfiloDto,
} from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { useTema } from '@/theme';
import { Button, Card, Input, Text } from '@/components/ui';

/**
 * Correggere i propri dati, dal telefono.
 *
 * Non è l'onboarding in tre passi: quello accompagna chi non ha ancora niente,
 * qui si viene per cambiare **una** riga. I quattro campi si mandano comunque
 * insieme, perché insieme sono un dato solo — il server non conosce un
 * aggiornamento parziale del profilo.
 *
 * L'ateneo è un campo libero senza suggerimenti: è un dato autodichiarato, e
 * chi corregge sa già cosa scrivere.
 */
export function ModificaProfilo({ profilo }: { profilo: ProfiloDto }) {
  const tema = useTema();
  const t = useT();

  const [dati, setDati] = useState<CompletaProfiloDto>({
    nome: profilo.nome ?? '',
    cognome: profilo.cognome ?? '',
    universita: profilo.universita ?? '',
    corso: profilo.corso ?? '',
  });

  const salva = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (valori: CompletaProfiloDto) => completaMioProfilo(valori),
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

  const completi =
    dati.nome.trim() && dati.cognome.trim() && dati.universita.trim() && dati.corso.trim();

  const aggiorna = (campo: keyof CompletaProfiloDto) => (valore: string) =>
    setDati((correnti) => ({ ...correnti, [campo]: valore }));

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ gap: 4 }}>
        <Text variante="sottotitolo" style={{ fontSize: 15.5 }}>
          {t('app.impostazioni.profilo.titolo')}
        </Text>
        <Text variante="didascalia">{t('app.impostazioni.profilo.testo')}</Text>
      </View>

      <Input
        etichetta={t('app.onboarding.nome')}
        value={dati.nome}
        onChangeText={aggiorna('nome')}
        autoComplete="given-name"
      />
      <Input
        etichetta={t('app.onboarding.cognome')}
        value={dati.cognome}
        onChangeText={aggiorna('cognome')}
        autoComplete="family-name"
      />
      <Input
        etichetta={t('app.onboarding.universita')}
        value={dati.universita}
        onChangeText={aggiorna('universita')}
      />
      <Input
        etichetta={t('app.onboarding.corso')}
        value={dati.corso}
        onChangeText={aggiorna('corso')}
      />

      <Button
        titolo={t('app.impostazioni.profilo.salva')}
        variante="contorno"
        larghezzaPiena
        inCaricamento={salva.isPending}
        disabled={!completi}
        onPress={() =>
          salva.mutate({
            nome: dati.nome.trim(),
            cognome: dati.cognome.trim(),
            universita: dati.universita.trim(),
            corso: dati.corso.trim(),
          })
        }
      />
    </Card>
  );
}
