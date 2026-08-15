import { Pressable, View } from 'react-native';
import type { CreaGruppoDtoVisibilita } from '@prome/api-client';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { Text } from '@/components/ui';

const OPZIONI: readonly {
  valore: CreaGruppoDtoVisibilita;
  chiave: 'privato' | 'ateneo' | 'pubblico';
}[] = [
  { valore: 'PRIVATO', chiave: 'privato' },
  { valore: 'ATENEO', chiave: 'ateneo' },
  { valore: 'PUBBLICO', chiave: 'pubblico' },
];

/**
 * Chi può vedere il gruppo.
 *
 * «Pubblico» significa **aperto agli iscritti a Prome**, mai al web: nessun
 * gruppo ha una pagina pubblica, e vedere un gruppo non è farne parte — si
 * entra per invito, sempre.
 *
 * Con `senzaAteneo` la voce di ateneo non si offre: un gruppo nato senza
 * ateneo non può esserne riservato, perché quel campo è congelato alla
 * creazione (G5), e sceglierla darebbe un gruppo visibile a nessuno.
 */
export function SceltaVisibilitaGruppo({
  valore,
  onScegli,
  senzaAteneo = false,
}: {
  valore: CreaGruppoDtoVisibilita;
  onScegli: (valore: CreaGruppoDtoVisibilita) => void;
  senzaAteneo?: boolean;
}) {
  const tema = useTema();
  const t = useT();

  return (
    <View style={{ gap: tema.spaziatura[2] }}>
      {OPZIONI.map((opzione) => {
        const impossibile = senzaAteneo && opzione.valore === 'ATENEO';
        const scelta = opzione.valore === valore;

        return (
          <Pressable
            key={opzione.valore}
            accessibilityRole="radio"
            accessibilityState={{ selected: scelta, disabled: impossibile }}
            disabled={impossibile}
            onPress={() => onScegli(opzione.valore)}
            style={{
              borderRadius: tema.raggio.lg,
              borderWidth: 2,
              borderColor: scelta ? tema.colori.primario : tema.colori.bordo,
              backgroundColor: scelta ? tema.colori.primarioTenue : tema.colori.superficie,
              padding: tema.spaziatura[3],
              gap: 3,
              opacity: impossibile ? 0.5 : 1,
            }}
          >
            <Text
              variante="etichetta"
              style={{ color: scelta ? tema.colori.primarioTesto : tema.colori.testo }}
            >
              {t(`app.gruppo.visibilita.${opzione.chiave}`)}
            </Text>
            <Text variante="didascalia">{t(`app.gruppo.visibilita.${opzione.chiave}Testo`)}</Text>
          </Pressable>
        );
      })}

      {senzaAteneo ? (
        <Text variante="didascalia">{t('app.gruppo.ateneoNonDisponibile')}</Text>
      ) : null}
    </View>
  );
}
