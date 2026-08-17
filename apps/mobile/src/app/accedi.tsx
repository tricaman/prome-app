import { View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { richiediCodiceAccesso, type RichiestaCodiceDto } from '@prome/api-client';
import { useApiMutation, useForm, useT } from '@/hooks';
import { rotte } from '@/content';
import { useTema } from '@/theme';
import { Form, FormInput, FormSubmit } from '@/components/form';
import { Intestazione, Screen, Text } from '@/components/ui';

/**
 * Accesso a Prome.
 *
 * Si chiede l'email e basta: il codice arriva per posta e sostituisce la
 * password. Chi arriva per la prima volta fa lo stesso identico percorso —
 * non esiste una registrazione separata — quindi non c'è nulla da scegliere
 * e nessun «hai già un account?» da chiedere.
 */
export default function SchermataAccedi() {
  const tema = useTema();
  const t = useT();

  const form = useForm({
    schema: z.object({ email: z.email() }),
    defaultValues: { email: '' },
  });

  // Avviso di esito ed errori sui campi sono automatici: qui resta soltanto
  // il passaggio alla schermata del codice, che è ciò che ha di proprio.
  const invio = useApiMutation<unknown, RichiestaCodiceDto>({
    mutationFn: (dati: RichiestaCodiceDto) => richiediCodiceAccesso(dati),
    form,
    onSuccess: (_esito, variabili) => router.push(rotte.codice(variabili.email)),
  });

  return (
    <>
      <Intestazione conIndietro />
      <Screen scorrevole conAreaSicura={false}>
        <View style={{ gap: tema.spaziatura[2] }}>
          <Text variante="titoloGrande" style={{ fontSize: 32 }}>
            {t('app.accesso.titolo')}
          </Text>
          <Text variante="corpoTenue">{t('app.accesso.sommario')}</Text>
        </View>

        <Form form={form}>
          <FormInput
            name="email"
            etichetta={t('app.accesso.email')}
            placeholder="nome@esempio.it"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            obbligatorio
          />

          <FormSubmit
            titolo={t('app.accesso.inviaCodice')}
            dimensione="lg"
            larghezzaPiena
            onSubmit={(valori) => invio.mutate(valori as RichiestaCodiceDto)}
          />
        </Form>
      </Screen>
    </>
  );
}
