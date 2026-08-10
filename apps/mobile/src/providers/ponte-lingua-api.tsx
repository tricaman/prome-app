import { useI18n } from '@/i18n/i18n-provider';
import { impostaLinguaApi } from '@/lib/api';

/**
 * Tiene allineata la lingua delle chiamate API a quella dell'interfaccia.
 *
 * Non disegna nulla: esiste solo perché il valore va aggiornato quando la
 * lingua cambia, e perché le richieste partano già con quella giusta.
 */
export function PonteLinguaApi() {
  const { lingua } = useI18n();
  impostaLinguaApi(lingua);
  return null;
}
