/*
  Warnings:

  - The primary key for the `profilo` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "accesso";

-- CreateEnum
CREATE TYPE "profilo"."visibilita" AS ENUM ('PRIVATO', 'ATENEO', 'PUBBLICO');

-- AlterTable
ALTER TABLE "profilo"."profilo" DROP CONSTRAINT "profilo_pkey",
ADD COLUMN     "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "utenteId" SET DATA TYPE TEXT,
ADD CONSTRAINT "profilo_pkey" PRIMARY KEY ("utenteId");

-- CreateTable
CREATE TABLE "accesso"."utente" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesso"."sessione" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesso"."credenziale" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credenziale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesso"."verifica" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profilo"."impostazioni_di_privacy" (
    "utenteId" TEXT NOT NULL,
    "contattabilita" "profilo"."visibilita" NOT NULL DEFAULT 'PRIVATO',
    "visibilita" "profilo"."visibilita" NOT NULL DEFAULT 'PRIVATO',
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impostazioni_di_privacy_pkey" PRIMARY KEY ("utenteId")
);

-- CreateIndex
CREATE UNIQUE INDEX "utente_email_key" ON "accesso"."utente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessione_token_key" ON "accesso"."sessione"("token");

-- CreateIndex
CREATE INDEX "sessione_userId_idx" ON "accesso"."sessione"("userId");

-- CreateIndex
CREATE INDEX "credenziale_userId_idx" ON "accesso"."credenziale"("userId");

-- CreateIndex
CREATE INDEX "verifica_identifier_idx" ON "accesso"."verifica"("identifier");

-- AddForeignKey
ALTER TABLE "accesso"."sessione" ADD CONSTRAINT "sessione_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accesso"."utente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesso"."credenziale" ADD CONSTRAINT "credenziale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "accesso"."utente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profilo"."impostazioni_di_privacy" ADD CONSTRAINT "impostazioni_di_privacy_utenteId_fkey" FOREIGN KEY ("utenteId") REFERENCES "profilo"."profilo"("utenteId") ON DELETE CASCADE ON UPDATE CASCADE;
