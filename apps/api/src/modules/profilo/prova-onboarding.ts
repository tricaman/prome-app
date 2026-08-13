/**
 * La prova che un Utente ha completato l'onboarding.
 *
 * Serve a un'invariante della Bacheca (B6): **un Post non è costruibile senza
 * la prova**. L'esistenza di un onboarding completato è un fatto che vive in
 * un altro contesto — la Bacheca non può interrogarlo al commit e non può
 * garantirlo — ma può garantire di non essere costruibile senza la prova.
 *
 * Il marchio qui sotto è un simbolo **non esportato**: nessun altro file può
 * scrivere un oggetto che soddisfi questo tipo, nemmeno copiandone la forma.
 * Non è una convenzione da rispettare, è un valore che si può solo ricevere.
 */
declare const marchioProva: unique symbol;

export interface ProvaOnboardingCompletato {
  readonly [marchioProva]: true;
  readonly utenteId: string;
}

/**
 * Emette la prova. **Solo Profilo può chiamarla**, ed è il contesto che
 * possiede il fatto: chiamarla altrove significherebbe affermare qualcosa che
 * non si è verificato.
 */
export function emettiProvaOnboarding(utenteId: string): ProvaOnboardingCompletato {
  return { utenteId } as ProvaOnboardingCompletato;
}
