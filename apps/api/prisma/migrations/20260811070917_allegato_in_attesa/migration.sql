-- CreateTable
CREATE TABLE "bacheca"."allegato_in_attesa" (
    "id" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "chiave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "bacheca"."tipo_allegato" NOT NULL,
    "dimensione" INTEGER NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allegato_in_attesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allegato_in_attesa_chiave_key" ON "bacheca"."allegato_in_attesa"("chiave");

-- CreateIndex
CREATE INDEX "allegato_in_attesa_autoreId_idx" ON "bacheca"."allegato_in_attesa"("autoreId");

-- CreateIndex
CREATE INDEX "allegato_in_attesa_creatoIl_idx" ON "bacheca"."allegato_in_attesa"("creatoIl");
