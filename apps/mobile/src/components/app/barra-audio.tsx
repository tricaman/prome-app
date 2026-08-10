import { Pressable, View } from 'react-native';
import { neutral, primary } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { useT } from '@/i18n/i18n-provider';
import { Avatar, Icona, Text } from '@/components/ui';

export interface BarraAudioProps {
  inAudio: boolean;
  microfonoSpento: boolean;
  /** Chi ha il permesso Parlare può entrare; gli altri restano in ascolto. */
  puoParlare: boolean;
  personeInAudio: readonly string[];
  partecipantiTotali: number;
  onEntra: () => void;
  onEsci: () => void;
  onAlternaMicrofono: () => void;
}

/**
 * Barra dell'audio dell'aula studio.
 *
 * Sta in fondo, su fondo scuro, e resta visibile qualunque scheda si stia
 * guardando: l'audio è l'unica cosa che continua mentre si fa altro e deve
 * poter essere interrotta con un tocco solo.
 *
 * Il fondo è scuro anche in tema chiaro, di proposito: è un'area di stato, non
 * di contenuto, e la differenza di colore la rende riconoscibile a colpo
 * d'occhio mentre si scorre.
 */
export function BarraAudio({
  inAudio,
  microfonoSpento,
  puoParlare,
  personeInAudio,
  partecipantiTotali,
  onEntra,
  onEsci,
  onAlternaMicrofono,
}: BarraAudioProps) {
  const tema = useTema();
  const t = useT();

  const stato = inAudio
    ? microfonoSpento
      ? t('app.sala.audioMuto')
      : t('app.sala.audioDentro', { numero: personeInAudio.length + 1 })
    : t('app.sala.audioFuori', {
        dentro: personeInAudio.length,
        totale: partecipantiTotali,
      });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tema.spaziatura[3],
        backgroundColor: neutral[900],
        paddingHorizontal: tema.spaziatura[4],
        paddingVertical: tema.spaziatura[3],
      }}
    >
      <Avatar nome={personeInAudio[0] ?? 'Giulia Ferrari'} dimensione={42} soloColore evidenziato />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variante="etichetta" numberOfLines={1} style={{ color: '#FFFFFF' }}>
          {t('app.sala.staParlando', { nome: personeInAudio[0] ?? 'Giulia' })}
        </Text>
        <Text variante="didascalia" numberOfLines={1} style={{ color: neutral[300] }}>
          {stato}
        </Text>
      </View>

      {inAudio ? (
        <View style={{ flexDirection: 'row', gap: tema.spaziatura[2] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              microfonoSpento ? t('app.sala.microfonoSpento') : t('app.sala.microfonoAttivo')
            }
            onPress={onAlternaMicrofono}
            style={{
              width: 44,
              height: 44,
              borderRadius: tema.raggio.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: microfonoSpento ? 'rgba(255,206,48,.2)' : 'rgba(255,255,255,.12)',
            }}
          >
            <Icona
              nome={microfonoSpento ? 'microfonoSpento' : 'microfono'}
              dimensione={20}
              colore="bianco"
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('app.sala.esciAudio')}
            onPress={onEsci}
            style={{
              height: 44,
              paddingHorizontal: tema.spaziatura[4],
              borderRadius: tema.raggio.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(244,63,94,.2)',
            }}
          >
            <Text variante="etichetta" style={{ fontSize: 13, color: '#FF8A9B' }}>
              {t('app.sala.esciAudio')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('app.sala.entraAudio')}
          accessibilityState={{ disabled: !puoParlare }}
          disabled={!puoParlare}
          onPress={onEntra}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tema.spaziatura[2],
            height: 44,
            paddingHorizontal: tema.spaziatura[4],
            borderRadius: tema.raggio.md,
            backgroundColor: primary[500],
            opacity: puoParlare ? 1 : 0.5,
          }}
        >
          <Icona nome="microfono" dimensione={18} colore="primarioTesto" />
          <Text variante="etichetta" style={{ fontSize: 13, color: tema.colori.primarioTesto }}>
            {t('app.sala.entraAudio')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
