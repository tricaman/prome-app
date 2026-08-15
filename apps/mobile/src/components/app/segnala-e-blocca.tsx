import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  bloccaUtente,
  segnalaContenuto,
  type CreaSegnalazioneDtoMotivo,
  type CreaSegnalazioneDtoTipo,
} from '@prome/api-client';
import { useTema } from '@/theme';
import { useApiMutation, useT } from '@/hooks';
import { Button, Text } from '@/components/ui';

const MOTIVI = ['SPAM', 'MOLESTIE', 'CONTENUTO_INAPPROPRIATO'] as const;

export interface SegnalaEBloccaProps {
  tipo: CreaSegnalazioneDtoTipo;
  soggettoId: string;
  /** L'autore del contenuto, per il blocco. */
  autore: { utenteId: string; nome: string };
  /** Dopo il blocco il contenuto non esiste più per chi guarda: chi monta decide dove andare. */
  onBloccato?: () => void;
  /** Chiavi da invalidare quando il blocco riesce (feed, commenti…). */
  invalidaAlBlocco?: readonly (readonly unknown[])[];
  /** `compatto` per le righe dei commenti, dove lo spazio è poco. */
  variante?: 'estesa' | 'compatta';
}

/**
 * «Segnala» e, dentro il pannello, «Blocca {nome}» — il gemello nativo del
 * componente web, con le stesse regole: un'affordance sola per contenuto, il
 * pannello che si apre sul posto (niente Alert, stile di casa), i motivi da
 * un elenco chiuso, il blocco con conferma a due passi.
 *
 * La condizione «mai sui propri contenuti, mai su un autore rimosso» sta in
 * chi lo monta: è chi monta a sapere chi sta guardando.
 */
export function SegnalaEBlocca({
  tipo,
  soggettoId,
  autore,
  onBloccato,
  invalidaAlBlocco = [],
  variante = 'estesa',
}: SegnalaEBloccaProps) {
  const tema = useTema();
  const t = useT();
  const [aperto, setAperto] = useState(false);
  const [confermaBlocco, setConfermaBlocco] = useState(false);

  const segnala = useApiMutation({
    mutationFn: (motivo: CreaSegnalazioneDtoMotivo) =>
      segnalaContenuto({ tipo, soggettoId, motivo }),
    onSuccess: () => {
      setAperto(false);
      setConfermaBlocco(false);
    },
  });

  const blocca = useApiMutation({
    mutationFn: () => bloccaUtente(autore.utenteId),
    invalida: invalidaAlBlocco as never[],
    onSuccess: () => {
      setAperto(false);
      setConfermaBlocco(false);
      onBloccato?.();
    },
  });

  if (!aperto) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.segnala.segnala')}
        onPress={() => setAperto(true)}
        hitSlop={8}
      >
        <Text
          variante="didascalia"
          style={variante === 'estesa' ? { color: tema.colori.testoTenue } : undefined}
        >
          {t('app.segnala.segnala')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={t('app.segnala.titolo')}
      style={{
        backgroundColor: tema.colori.superficieAlt,
        borderColor: tema.colori.bordo,
        borderWidth: 1,
        borderRadius: tema.raggio.lg,
        padding: tema.spaziatura[3],
        gap: tema.spaziatura[3],
      }}
    >
      <View style={{ gap: 2 }}>
        <Text variante="etichetta">{t('app.segnala.titolo')}</Text>
        <Text variante="didascalia">
          {t('app.segnala.testo')} {t('app.segnala.lineeGuida')}.
        </Text>
      </View>

      <View style={{ gap: tema.spaziatura[2] }}>
        {MOTIVI.map((motivo) => (
          <Button
            key={motivo}
            titolo={t(`app.segnala.motivi.${motivo}`)}
            variante="contorno"
            larghezzaPiena
            inCaricamento={segnala.isPending && segnala.variables === motivo}
            disabled={segnala.isPending || blocca.isPending}
            onPress={() => segnala.mutate(motivo)}
          />
        ))}
      </View>

      <View
        style={{
          borderTopColor: tema.colori.bordo,
          borderTopWidth: 1,
          paddingTop: tema.spaziatura[3],
          gap: tema.spaziatura[2],
        }}
      >
        {confermaBlocco ? (
          <>
            <Text variante="didascalia">{t('app.segnala.bloccaConferma')}</Text>
            <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
              <View style={{ flex: 1 }}>
                <Button
                  titolo={t('comune.annulla')}
                  variante="contorno"
                  larghezzaPiena
                  onPress={() => setConfermaBlocco(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  titolo={t('app.segnala.bloccaDavvero')}
                  variante="distruttiva"
                  larghezzaPiena
                  inCaricamento={blocca.isPending}
                  onPress={() => blocca.mutate(undefined)}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
            <View style={{ flex: 1 }}>
              <Button
                titolo={t('app.segnala.blocca', { nome: autore.nome })}
                variante="fantasma"
                larghezzaPiena
                disabled={segnala.isPending}
                onPress={() => setConfermaBlocco(true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                titolo={t('app.segnala.annulla')}
                variante="fantasma"
                larghezzaPiena
                onPress={() => {
                  setAperto(false);
                  setConfermaBlocco(false);
                }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
