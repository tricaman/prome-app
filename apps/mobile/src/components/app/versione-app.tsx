import Constants from 'expo-constants';
import { useT } from '@/hooks';
import { Text } from '@/components/ui';

/**
 * The signature line at the bottom: version and motto.
 *
 * The version is **read at runtime**, never written in a constant: it lives
 * in `app.config.ts` and is bumped on every store build (DEPLOY.md, section 1),
 * so a number written here would be stale from the next build, and it is the
 * detail people read right before reporting a problem.
 *
 * The motto is the website's, from the same two keys: it is split in two
 * because there the second word is colored.
 */
export function VersioneApp() {
  const t = useT();
  const versione = Constants.expoConfig?.version;

  if (!versione) {
    return null;
  }

  return (
    <Text variante="didascalia" allineamento="center">
      {t('app.profilo.versione', {
        versione,
        motto: `${t('sito.motto1')} ${t('sito.motto2')}`,
      })}
    </Text>
  );
}
