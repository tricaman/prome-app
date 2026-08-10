import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTema } from '@/theme';
import { Text } from './text';

export interface InputProps extends Omit<TextInputProps, 'style' | 'onChangeText'> {
  etichetta?: string;
  aiuto?: string;
  errore?: string;
  obbligatorio?: boolean;
  /** Numero di righe: oltre 1 il campo diventa multiriga. */
  righe?: number;
  massimoCaratteri?: number;
  onChangeText?: (valore: string) => void;
}

/**
 * Campo di testo.
 *
 * Etichetta, aiuto ed errore stanno insieme al campo: l'errore compare sotto,
 * dove l'utente guarda dopo aver sbagliato, e il bordo cambia colore per
 * chi non distingue bene il rosso dal grigio.
 */
export function Input({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  righe = 1,
  massimoCaratteri,
  value,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const tema = useTema();
  const [inFuoco, setInFuoco] = useState(false);

  const coloreBordo = errore
    ? tema.colori.errore
    : inFuoco
      ? tema.colori.primario
      : tema.colori.bordo;

  return (
    <View style={{ gap: tema.spaziatura[1] }}>
      {etichetta ? (
        <Text variante="etichetta">
          {etichetta}
          {obbligatorio ? <Text style={{ color: tema.colori.errore }}> *</Text> : null}
        </Text>
      ) : null}

      <TextInput
        {...props}
        value={value}
        multiline={righe > 1}
        numberOfLines={righe}
        maxLength={massimoCaratteri}
        placeholderTextColor={tema.colori.campoSegnaposto}
        accessibilityLabel={etichetta}
        // Lo stato di errore va comunicato anche a chi usa uno screen reader.
        accessibilityHint={errore ?? aiuto}
        onFocus={(evento) => {
          setInFuoco(true);
          onFocus?.(evento);
        }}
        onBlur={(evento) => {
          setInFuoco(false);
          onBlur?.(evento);
        }}
        style={[
          tema.testo.corpo,
          {
            backgroundColor: tema.colori.campo,
            color: tema.colori.campoTesto,
            borderWidth: 1,
            borderColor: coloreBordo,
            borderRadius: tema.raggio.lg,
            paddingHorizontal: tema.spaziatura[4],
            paddingVertical: tema.spaziatura[3],
            minHeight: righe > 1 ? 24 * righe + 24 : 48,
            textAlignVertical: righe > 1 ? 'top' : 'center',
          },
        ]}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          {errore ? (
            <Text variante="didascalia" colore="errore">
              {errore}
            </Text>
          ) : aiuto ? (
            <Text variante="didascalia">{aiuto}</Text>
          ) : null}
        </View>
        {massimoCaratteri ? (
          <Text variante="didascalia">
            {value?.length ?? 0}/{massimoCaratteri}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
