import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { useTema } from '@/theme';

export interface FormProps<TValori extends FieldValues> {
  form: UseFormReturn<TValori, unknown, TValori>;
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Contenitore del form: mette il form nel contesto, così i campi si collegano
 * da soli citando il proprio nome.
 *
 * Qui non c'è un evento di invio come sul web: l'invio parte dal pulsante
 * (`FormSubmit`), che chiama `handleSubmit` sul form del contesto.
 *
 * ```tsx
 * const form = useForm({ schema, defaultValues })
 * <Form form={form}>
 *   <FormInput name="titolo" etichetta="Titolo" />
 *   <FormSubmit titolo="Pubblica" onSubmit={(v) => salva.mutate(v)} />
 * </Form>
 * ```
 */
export function Form<TValori extends FieldValues>({ form, children, style }: FormProps<TValori>) {
  const tema = useTema();

  return (
    <FormProvider {...form}>
      <View style={[{ gap: tema.spaziatura[4] }, style]}>{children}</View>
    </FormProvider>
  );
}
