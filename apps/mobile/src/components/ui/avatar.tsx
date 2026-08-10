import { View, type ViewStyle } from 'react-native';
import { riempimenti, RIEMPIMENTO_TESTO } from '@prome/design-tokens';
import { useTema } from '@/theme';
import { Text } from './text';

/**
 * Sempre lo stesso colore per la stessa persona: cambia solo se cambia il nome.
 *
 * I riempimenti non seguono il tema — un avatar resta pastello anche di notte —
 * e per questo le iniziali sopra sono sempre scure.
 */
function tintaDi(seme: string): string {
  let somma = 0;
  for (let i = 0; i < seme.length; i += 1) somma += seme.charCodeAt(i);
  return riempimenti[somma % riempimenti.length]!;
}

export interface AvatarProps {
  nome: string;
  dimensione?: number;
  /** Nasconde le iniziali: per i gruppi decorativi di avatar. */
  soloColore?: boolean;
  /** Anello attorno all'avatar: segnala chi sta parlando. */
  evidenziato?: boolean;
  style?: ViewStyle;
}

/**
 * Ritratto di una persona.
 *
 * Finché non ci sono immagini reali mostra le iniziali su una tinta derivata
 * dal nome: riconoscibile e stabile, senza il grigio anonimo di un segnaposto.
 */
export function Avatar({
  nome,
  dimensione = 40,
  soloColore = false,
  evidenziato = false,
  style,
}: AvatarProps) {
  const tema = useTema();
  const iniziali = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      accessibilityLabel={nome}
      style={[
        {
          width: dimensione,
          height: dimensione,
          borderRadius: tema.raggio.full,
          backgroundColor: tintaDi(nome),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: evidenziato ? 2.5 : 0,
          borderColor: tema.colori.primario,
        },
        style,
      ]}
    >
      {soloColore ? null : (
        <Text
          style={{
            fontSize: dimensione * 0.36,
            fontWeight: tema.tipografia.peso.extra,
            color: RIEMPIMENTO_TESTO,
          }}
        >
          {iniziali}
        </Text>
      )}
    </View>
  );
}

/** Avatar sovrapposti: quante persone ci sono, non chi sono. */
export function AvatarGroup({
  nomi,
  dimensione = 28,
}: {
  nomi: readonly string[];
  dimensione?: number;
}) {
  const tema = useTema();

  return (
    <View style={{ flexDirection: 'row' }}>
      {nomi.map((nome, indice) => (
        <View
          key={nome}
          style={{
            marginLeft: indice === 0 ? 0 : -9,
            borderWidth: 2,
            borderColor: tema.colori.superficie,
            borderRadius: tema.raggio.full,
          }}
        >
          <Avatar nome={nome} dimensione={dimensione} soloColore />
        </View>
      ))}
    </View>
  );
}
