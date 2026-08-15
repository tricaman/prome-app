import { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { useSessione } from '@prome/app-core';
import { rotte } from '@/content';
import { Providers } from '@/providers/providers';
import { useTema } from '@/theme';

/** Radice dell'app: monta i contesti e poi lo stack delle schermate. */
export default function RootLayout() {
  return (
    <Providers>
      <Navigazione />
    </Providers>
  );
}

/**
 * Le schermate raggiungibili senza sessione, per primo segmento del percorso.
 *
 * L'elenco è **chiuso e per esclusione**: una schermata nuova nasce protetta
 * per il solo fatto di non essere qui dentro, come gli endpoint dell'API con
 * la guardia globale. L'elenco inverso — «queste chiedono l'accesso» — lascia
 * scoperto ciò che ci si dimentica di aggiungere, che è la regola sbagliata da
 * dare a chi arriverà dopo.
 */
const SENZA_SESSIONE = new Set(['accedi', 'codice']);

/**
 * Il codice è pubblico ma **non rimanda indietro chi è entrato**, e non è una
 * dimenticanza: è la schermata su cui la sessione nasce. Un istante dopo
 * `apriSessione` questa guardia e la schermata vorrebbero navigare tutte e
 * due, e vincerebbe l'ultima — mandando sulla bacheca chi il profilo non l'ha
 * ancora compilato. Chi ha appena verificato il codice sa dove deve andare:
 * quella decisione resta sua.
 */
function rimandaIndietroChiEDentro(primo: string | undefined): boolean {
  return primo === undefined || primo === 'accedi';
}

/**
 * Sta dentro i provider perché legge il tema: barra di stato e sfondo delle
 * schermate seguono chiaro/scuro come tutto il resto.
 *
 * Le intestazioni di sistema sono spente ovunque: ogni schermata disegna la
 * propria con `Intestazione`, che ha titolo grande, sottotitolo e azioni.
 */
function Navigazione() {
  const tema = useTema();
  const { autenticato, caricata } = useSessione();
  const segmenti = useSegments();
  const queryClient = useQueryClient();
  /** Se la sessione c'era: serve a riconoscere l'istante in cui cade. */
  const eraDentro = useRef(false);

  useEffect(() => {
    // «Non lo sappiamo ancora» non è «non sei entrato»: l'archivio cifrato si
    // legge in modo asincrono, e decidere prima butterebbe fuori a ogni
    // riavvio dell'app chi è regolarmente dentro.
    if (!caricata) return;

    // La cache si svuota **qui**, e non dove si preme «esci», perché una
    // sessione può cadere in molti modi — il bottone, una revoca da un altro
    // dispositivo, una scadenza — e questo è il punto che li vede tutti. Se
    // restasse, chi entra dopo su questo telefono troverebbe in bacheca i post
    // di chi c'era prima, senza che nessuna richiesta sia mai partita.
    if (eraDentro.current && !autenticato) queryClient.clear();
    eraDentro.current = autenticato;

    // Senza segmenti si è sul benvenuto, che è pubblico per definizione.
    const primo = segmenti[0];
    const pubblica = primo === undefined || SENZA_SESSIONE.has(primo);

    if (!autenticato && !pubblica) router.replace(rotte.benvenuto());
    // Chi è già dentro non deve rivedere il benvenuto: chiedere un codice con
    // una sessione viva ne fa partire uno vero, per niente.
    else if (autenticato && rimandaIndietroChiEDentro(primo)) router.replace(rotte.bacheca());
  }, [caricata, autenticato, segmenti, queryClient]);

  // Finché non si sa, non si disegna nulla: la schermata di partenza è quella
  // di chi non è entrato, e mostrarla a chi è entrato sarebbe un lampo di app
  // sbagliata a ogni apertura. Lo schermo di avvio è ancora sopra.
  if (!caricata) return null;

  return (
    <>
      <StatusBar style={tema.eScuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tema.colori.sfondo },
        }}
      >
        {/* La composizione di un post arriva dal basso: è un'azione che si
            apre sopra la bacheca e si chiude tornando dov'eri. */}
        <Stack.Screen name="componi" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
