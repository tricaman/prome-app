import { View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useForm, useT } from '@/hooks';
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

  return (
    <>
      <Intestazione conIndietro />
      <Screen scorrevole>
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
            placeholder="nome.cognome@studenti.unibo.it"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            obbligatorio
          />

          <FormSubmit
            titolo={t('app.accesso.inviaCodice')}
            dimensione="lg"
            larghezzaPiena
            onSubmit={(valori) => router.push(rotte.codice(valori.email))}
          />
        </Form>

        <Text variante="didascalia">{t('app.accesso.primoAccesso')}</Text>
      </Screen>
    </>
  );
}
