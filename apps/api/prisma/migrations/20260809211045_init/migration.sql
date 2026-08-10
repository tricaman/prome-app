-- CreateSchema
-- Prisma genera solo gli schemi con modelli: gli altri quattro (per ora vuoti)
-- vengono creati qui a mano, uno per bounded context + cancellazione.
CREATE SCHEMA IF NOT EXISTS "profilo";
CREATE SCHEMA IF NOT EXISTS "bacheca";
CREATE SCHEMA IF NOT EXISTS "gruppo";
CREATE SCHEMA IF NOT EXISTS "aula_studio";
CREATE SCHEMA IF NOT EXISTS "cancellazione";

-- CreateTable
CREATE TABLE "profilo"."profilo" (
    "utenteId" UUID NOT NULL,
    "nome" TEXT,
    "cognome" TEXT,
    "universita" TEXT,
    "corso" TEXT,
    "onboardingCompletato" BOOLEAN NOT NULL DEFAULT false,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profilo_pkey" PRIMARY KEY ("utenteId")
);
