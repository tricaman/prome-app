import { Pressable, View } from 'react-native';
import { useTema } from '@/theme';
import { Text } from './text';

export interface OpzioneRadio<T extends string> {
  valore: T;
  etichetta: string;
  /** Cosa comporta la scelta. Non è decorazione: è la scelta stessa. */
  descrizione: string;
  /** Scelta che in questo contesto non è offribile, con la sua ragione a schermo. */
  impossibile?: boolean;
}

export interface SceltaRadioProps<T extends string> {
  opzioni: readonly OpzioneRadio<T>[];
  valore: T;
  /** Cosa si sta scegliendo: lo legge chi non vede lo schermo. */
  etichetta: string;
  inCorso?: boolean;
  disabilitato?: boolean;
  /** Pallino a sinistra oltre al bordo: serve dove le scelte sono più d'una in schermata. */
  conPallino?: boolean;
  onScegli: (valore: T) => void;
}

/**
 * Scelta singola fra opzioni che hanno conseguenze.
 *
 * Card e non segmenti: fra Privato, Ateneo e Pubblico la differenza è troppo
 * concreta per stare in una parola sola, e ogni opzione deve poter dire cosa
 * comporta. Era scritta a mano nelle impostazioni e nella creazione di un
 * gruppo; la schermata della privacy ne vuole due, e quattro copie della
 * stessa cosa sono tre di troppo.
 */
export function SceltaRadio<T extends string>({
  opzioni,
  valore,
  etichetta,
  inCorso = false,
  disabilitato = false,
  conPallino = false,
  onScegli,
}: SceltaRadioProps<T>) {
  const tema = useTema();
  const spenta = inCorso || disabilitato;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={etichetta}
      style={{ gap: tema.spaziatura[2] }}
    >
      {opzioni.map((opzione) => {
        const scelta = opzione.valore === valore;
        const inerte = spenta || Boolean(opzione.impossibile);

        return (
          <Pressable
            key={opzione.valore}
            accessibilityRole="radio"
            accessibilityState={{ selected: scelta, disabled: inerte }}
            disabled={inerte}
            // Riscegliere ciò che è già scelto non è un cambio: evita una
            // richiesta e un avviso che confermerebbe una cosa già vera.
            onPress={() => !scelta && onScegli(opzione.valore)}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: tema.spaziatura[3],
              borderRadius: tema.raggio.lg,
              borderWidth: 2,
              borderColor: scelta ? tema.colori.primario : tema.colori.bordo,
              backgroundColor: scelta ? tema.tinte.menta.velo : tema.colori.superficie,
              padding: tema.spaziatura[3],
              opacity: inerte ? 0.55 : 1,
            }}
          >
            {conPallino ? (
              <View
                style={{
                  width: 20,
                  height: 20,
                  marginTop: 1,
                  borderRadius: tema.raggio.full,
                  borderWidth: 2,
                  borderColor: scelta ? tema.colori.primario : tema.colori.bordoForte,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {scelta ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: tema.raggio.full,
                      backgroundColor: tema.colori.primario,
                    }}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text
                variante="etichetta"
                style={{ color: scelta ? tema.colori.primarioAccento : tema.colori.testo }}
              >
                {opzione.etichetta}
              </Text>
              <Text variante="didascalia">{opzione.descrizione}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
