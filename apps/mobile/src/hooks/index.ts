/**
 * Punto unico da cui le schermate prendono gli hook.
 *
 * `useApiMutation` e `useForm` vivono nel pacchetto condiviso: app mobile e
 * sito usano lo stesso identico comportamento, quindi una correzione vale per
 * entrambi.
 */
export { useApiMutation, useForm, type OpzioniApiMutation, type FormProme } from '@prome/app-core';
export { useI18n, useT } from '@/i18n/i18n-provider';
export { useTema } from '@/theme';
export { useChatAula, type StatoConnessione } from './use-chat-aula';
export { useConferma, type Conferma } from './use-conferma';
export { useFotoProfilo, type FotoProfilo } from './use-foto-profilo';
export { useNotificheLive, useNonLette } from './use-notifiche';
