/**
 * Punto unico da cui le pagine prendono gli hook.
 *
 * `useApiMutation` e `useForm` vivono nel pacchetto condiviso: web e mobile
 * usano lo stesso identico comportamento, quindi una correzione vale per
 * entrambi. Qui si aggiungono soltanto gli hook che hanno senso sul web.
 */
export { useApiMutation, useForm, type OpzioniApiMutation, type FormProme } from '@prome/app-core';
export { useMediaQuery, useSchermoPiccolo } from './use-media-query';
export { useNotificheLive } from './use-notifiche';
