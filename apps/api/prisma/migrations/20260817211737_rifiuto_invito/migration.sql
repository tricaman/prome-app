-- Il secondo stato conclusivo per scelta di chi ha ricevuto l'invito: la
-- scadenza accade a chi non risponde, il rifiuto È una risposta.
--
-- `BEFORE 'SCADUTO'` e non in coda: l'ordine dei valori nel tipo resta quello
-- dichiarato nello schema Prisma, altrimenti ogni `migrate diff` successivo
-- vedrebbe una differenza che non c'è.

-- AlterEnum
ALTER TYPE "aula_studio"."stato_invito" ADD VALUE 'RIFIUTATO' BEFORE 'SCADUTO';

-- AlterEnum
ALTER TYPE "gruppo"."stato_invito_al_gruppo" ADD VALUE 'RIFIUTATO' BEFORE 'SCADUTO';
