-- CreateEnum
CREATE TYPE "bacheca"."tipo_allegato" AS ENUM ('PDF', 'IMMAGINE', 'TESTO');

-- CreateTable
CREATE TABLE "bacheca"."post" (
    "id" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bacheca"."allegato" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "bacheca"."tipo_allegato" NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allegato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_creatoIl_idx" ON "bacheca"."post"("creatoIl" DESC);

-- CreateIndex
CREATE INDEX "post_autoreId_idx" ON "bacheca"."post"("autoreId");

-- CreateIndex
CREATE UNIQUE INDEX "allegato_chiave_key" ON "bacheca"."allegato"("chiave");

-- CreateIndex
CREATE INDEX "allegato_postId_idx" ON "bacheca"."allegato"("postId");

-- AddForeignKey
ALTER TABLE "bacheca"."allegato" ADD CONSTRAINT "allegato_postId_fkey" FOREIGN KEY ("postId") REFERENCES "bacheca"."post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
