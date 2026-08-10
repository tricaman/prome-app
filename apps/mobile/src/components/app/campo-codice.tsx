import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Text } from '@/components/ui';

const LUNGHEZZA = 6;

/**
 * Codice a sei cifre.
 *
 * Ogni cifra ha la sua casella e il fuoco avanza da solo; il tasto di
 * cancellazione torna indietro. `textContentType="oneTimeCode"` fa comparire
 * il suggerimento della tastiera su iOS e attiva l'autocompletamento su
 * Android: è la ragione per cui questo campo esiste separato da un input
 * normale.
 */
export function CampoCodice({ onCompletato }: { onCompletato?: (codice: string) => void }) {
  const tema = useTema();
  const t = useT();
  const [cifre, setCifre] = useState<string[]>(Array<string>(LUNGHEZZA).fill(''));
  const caselle = useRef<(TextInput | null)[]>([]);

  const scrivi = (indice: number, valore: string) => {
    const pulito = valore.replace(/\D/g, '');

    setCifre((precedenti) => {
      const prossime = [...precedenti];
      if (!pulito) {
        prossime[indice] = '';
        return prossime;
      }
      // Incollando il codice intero si riempiono le caselle da qui in poi.
      for (let scorrimento = 0; scorrimento < pulito.length; scorrimento += 1) {
        const posizione = indice + scorrimento;
        if (posizione < LUNGHEZZA) prossime[posizione] = pulito[scorrimento]!;
      }
      if (prossime.every((cifra) => cifra)) onCompletato?.(prossime.join(''));
      return prossime;
    });

    if (pulito) {
      caselle.current[Math.min(indice + pulito.length, LUNGHEZZA - 1)]?.focus();
    }
  };

  return (
    <View style={{ gap: tema.spaziatura[2] }}>
      <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
        {cifre.map((cifra, indice) => (
          <TextInput
            key={indice}
            ref={(elemento) => {
              caselle.current[indice] = elemento;
            }}
            value={cifra}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={LUNGHEZZA}
            accessibilityLabel={`${t('app.accesso.codice')} ${indice + 1}`}
            onChangeText={(valore) => scrivi(indice, valore)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !cifre[indice] && indice > 0) {
                caselle.current[indice - 1]?.focus();
              }
            }}
            style={{
              flex: 1,
              height: 62,
              textAlign: 'center',
              fontSize: 24,
              fontWeight: tema.tipografia.peso.extra,
              color: tema.colori.campoTesto,
              borderRadius: tema.raggio.xl,
              borderWidth: 1.8,
              borderColor: cifra ? tema.colori.primario : tema.colori.bordoForte,
              backgroundColor: cifra ? tema.colori.primarioTenue : tema.colori.campo,
            }}
          />
        ))}
      </View>
      <Text variante="didascalia">{t('app.accesso.codiceAiuto')}</Text>
    </View>
  );
}
