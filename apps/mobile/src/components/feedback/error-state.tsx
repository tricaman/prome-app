import { View } from 'react-native';
import { codiceErrore, messaggioErrore, riferimentoErrore } from '@prome/app-core';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Button, Text } from '@/components/ui';

export interface ErrorStateProps {
  errore?: unknown;
  titolo?: string;
  descrizione?: string;
  onRiprova?: () => void;
}

/**
 * Errore con quello che serve: cosa è successo, come riprovare e il
 * riferimento da citare in una segnalazione. Il messaggio arriva dal server
 * già nella lingua dell'utente.
 */
export function ErrorState({ errore, titolo, descrizione, onRiprova }: ErrorStateProps) {
  const tema = useTema();
  const t = useT();

  const messaggio = errore !== undefined ? messaggioErrore(errore) : undefined;
  const codice = codiceErrore(errore);
  const riferimento = riferimentoErrore(errore);

  return (
    <View
      accessibilityRole="alert"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tema.spaziatura[3],
        paddingVertical: tema.spaziatura[10],
        minHeight: 200,
      }}
    >
      <Text variante="sottotitolo" allineamento="center">
        {titolo ?? t('errori.caricamentoDati.titolo')}
      </Text>
      <Text variante="corpoTenue" allineamento="center">
        {descrizione ?? messaggio ?? t('errori.caricamentoDati.descrizione')}
      </Text>

      {onRiprova ? (
        <Button titolo={t('comune.riprova')} variante="secondaria" onPress={onRiprova} />
      ) : null}

      {codice || riferimento ? (
        <Text variante="didascalia" colore="debole" allineamento="center">
          {[
            codice ? t('errori.codice', { codice }) : null,
            riferimento ? t('errori.riferimento', { id: riferimento }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}
