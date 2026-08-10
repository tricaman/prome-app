'use client';

import type { FormEvent, ReactNode } from 'react';
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

export interface FormProps<TValori extends FieldValues> {
  form: UseFormReturn<TValori, unknown, TValori>;
  onSubmit: (valori: TValori) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Contenitore del form: mette il form nel contesto, così i campi si collegano
 * da soli citando il proprio nome e non serve passare `control` a mano.
 *
 * L'invio non risale oltre questo form: quando un form sta dentro un altro
 * (creazione di un elemento dentro una scheda più grande) il pulsante interno
 * non deve far partire anche l'invio esterno.
 *
 * ```tsx
 * const form = useForm({ schema, defaultValues })
 * <Form form={form} onSubmit={(valori) => salva.mutate(valori)}>
 *   <FormInput name="titolo" etichetta="Titolo" />
 *   <FormSubmit>Pubblica</FormSubmit>
 * </Form>
 * ```
 */
export function Form<TValori extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  id,
}: FormProps<TValori>) {
  const gestisciInvio = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    evento.stopPropagation();
    void form.handleSubmit(onSubmit)(evento);
  };

  return (
    <FormProvider {...form}>
      {/* `noValidate`: i messaggi li scriviamo noi, tradotti e coerenti. */}
      <form id={id} onSubmit={gestisciInvio} className={cn('flex flex-col gap-5', className)} noValidate>
        {children}
      </form>
    </FormProvider>
  );
}
