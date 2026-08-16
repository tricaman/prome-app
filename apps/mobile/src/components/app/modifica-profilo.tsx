import { useState } from 'react';
import { View } from 'react-native';
import {
  completaMioProfilo,
  getLeggiMioProfiloQueryKey,
  useElencaCorsiDiUniversita,
  useElencaUniversita,
  type CompletaProfiloDto,
  type ProfiloDto,
} from '@prome/api-client';
import { useApiMutation, useT } from '@/hooks';
import { useTema } from '@/theme';
import { Button, Card, Input, Text } from '@/components/ui';
import { ElencoCatalogo } from './elenco-catalogo';

/** Quante voci mostrare: oltre, l'elenco riempie lo schermo del telefono. */
const VOCI_VISIBILI = 6;

/**
 * Correggere i propri dati, dal telefono.
 *
 * Non è l'onboarding in tre passi: quello accompagna chi non ha ancora niente,
 * qui si viene per cambiare **una** riga. I campi si mandano comunque insieme,
 * perché insieme sono un dato solo — il server non conosce un aggiornamento
 * parziale del profilo.
 *
 * Ateneo e corso non sono due dati ma uno: al server arriva il corso, che si
 * porta dietro il proprio ateneo. Il catalogo è chiuso, quindi si sceglie da
 * un elenco — non c'è un campo in cui scrivere il nome di un corso.
 */
export function ModificaProfilo({ profilo }: { profilo: ProfiloDto }) {
  const tema = useTema();
  const t = useT();

  const [nome, setNome] = useState(profilo.nome ?? '');
  const [cognome, setCognome] = useState(profilo.cognome ?? '');
  const [ateneo, setAteneo] = useState<string | null>(profilo.universita?.id ?? null);
  const [ricercaAteneo, setRicercaAteneo] = useState(profilo.universita?.nome ?? '');
  const [corso, setCorso] = useState<string | null>(profilo.corso?.id ?? null);
  const [ricercaCorso, setRicercaCorso] = useState(profilo.corso?.nome ?? '');

  const atenei = useElencaUniversita({
    ricerca: ricercaAteneo.trim() || undefined,
    limit: VOCI_VISIBILI,
  });
  const corsi = useElencaCorsiDiUniversita(
    ateneo ?? '',
    { ricerca: ricercaCorso.trim() || undefined, limit: VOCI_VISIBILI },
    // Senza ateneo la domanda non ha senso: non si chiede.
    { query: { enabled: Boolean(ateneo) } },
  );

  const salva = useApiMutation<unknown, CompletaProfiloDto>({
    mutationFn: (valori: CompletaProfiloDto) => completaMioProfilo(valori),
    invalida: [getLeggiMioProfiloQueryKey() as never],
  });

  const completi = Boolean(nome.trim() && cognome.trim() && corso);

  return (
    <Card style={{ gap: tema.spaziatura[3] }}>
      <View style={{ gap: 4 }}>
        <Text variante="sottotitolo" style={{ fontSize: 15.5 }}>
          {t('app.impostazioni.profilo.titolo')}
        </Text>
        <Text variante="didascalia">{t('app.impostazioni.profilo.testo')}</Text>
      </View>

      <Input
        etichetta={t('app.onboarding.nome')}
        value={nome}
        onChangeText={setNome}
        autoComplete="given-name"
      />
      <Input
        etichetta={t('app.onboarding.cognome')}
        value={cognome}
        onChangeText={setCognome}
        autoComplete="family-name"
      />

      <ElencoCatalogo
        etichetta={t('app.onboarding.universita')}
        segnaposto={t('app.onboarding.cercaUniversita')}
        vuoto={t('app.onboarding.nessunRisultato')}
        voci={(atenei.data?.data ?? []).map((voce) => ({
          id: voce.id,
          titolo: voce.nome,
          dettaglio: voce.citta,
        }))}
        sceltaId={ateneo}
        ricerca={ricercaAteneo}
        onRicerca={setRicercaAteneo}
        onScelta={(voce) => {
          setAteneo(voce.id);
          setRicercaAteneo(voce.titolo);
          // Cambiare ateneo invalida il corso: quel corso è di un altro
          // ateneo, e tenerlo manderebbe un dato incoerente.
          setCorso(null);
          setRicercaCorso('');
        }}
      />

      <ElencoCatalogo
        etichetta={t('app.onboarding.corso')}
        segnaposto={ateneo ? t('app.onboarding.cercaCorso') : t('app.onboarding.primaLAteneo')}
        vuoto={ateneo ? t('app.onboarding.nessunCorsoTrovato') : t('app.onboarding.primaLAteneo')}
        voci={(corsi.data?.data ?? []).map((voce) => ({
          id: voce.id,
          titolo: voce.nome,
          dettaglio: `${voce.classe.codice} · ${t('app.onboarding.durataAnni', {
            numero: String(voce.durataAnni),
          })}`,
        }))}
        sceltaId={corso}
        ricerca={ricercaCorso}
        onRicerca={setRicercaCorso}
        onScelta={(voce) => {
          setCorso(voce.id);
          setRicercaCorso(voce.titolo);
        }}
      />

      <Button
        titolo={t('app.impostazioni.profilo.salva')}
        variante="contorno"
        larghezzaPiena
        inCaricamento={salva.isPending}
        disabled={!completi}
        onPress={() =>
          salva.mutate({ nome: nome.trim(), cognome: cognome.trim(), corsoId: corso ?? '' })
        }
      />
    </Card>
  );
}
