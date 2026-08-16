import Constants from 'expo-constants';
import { useT } from '@/hooks';
import { Text } from '@/components/ui';

/**
 * La riga di firma in fondo: versione e motto.
 *
 * La versione **si legge a runtime** e non si scrive in una costante: le
 * versioni le tiene EAS (`appVersionSource: "remote"`, con incremento
 * automatico in produzione), quindi un numero scritto qui sarebbe vecchio dal
 * primo rilascio e nessuno se ne accorgerebbe — è esattamente il tipo di
 * dettaglio che si legge quando si sta per segnalare un problema.
 *
 * Il motto è quello del sito, dalle stesse due chiavi: è spezzato in due
 * perché lì la seconda parola è colorata.
 */
export function VersioneApp() {
  const t = useT();
  const versione = Constants.expoConfig?.version;

  if (!versione) return null;

  return (
    <Text variante="didascalia" allineamento="center">
      {t('app.profilo.versione', {
        versione,
        motto: `${t('sito.motto1')} ${t('sito.motto2')}`,
      })}
    </Text>
  );
}
