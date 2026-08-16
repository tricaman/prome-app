import { View } from 'react-native';
import type { CreaGruppoDtoVisibilita } from '@prome/api-client';
import { useTema } from '@/theme';
import { useT } from '@/hooks';
import { SceltaRadio, Text } from '@/components/ui';

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
      <SceltaRadio
        opzioni={OPZIONI.map((opzione) => ({
          valore: opzione.valore,
          etichetta: t(`app.gruppo.visibilita.${opzione.chiave}`),
          descrizione: t(`app.gruppo.visibilita.${opzione.chiave}Testo`),
          impossibile: senzaAteneo && opzione.valore === 'ATENEO',
        }))}
        valore={valore}
        etichetta={t('app.gruppo.visibilita.privato')}
        onScegli={onScegli}
      />

      {senzaAteneo ? (
        <Text variante="didascalia">{t('app.gruppo.ateneoNonDisponibile')}</Text>
      ) : null}
    </View>
  );
}
