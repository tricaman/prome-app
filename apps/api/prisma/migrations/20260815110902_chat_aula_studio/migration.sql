-- CreateTable
CREATE TABLE "aula_studio"."messaggio_di_chat" (
    "id" TEXT NOT NULL,
    "aulaStudioId" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "inviatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaggio_di_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messaggio_di_chat_aulaStudioId_inviatoIl_idx" ON "aula_studio"."messaggio_di_chat"("aulaStudioId", "inviatoIl");

-- CreateIndex
CREATE INDEX "messaggio_di_chat_autoreId_idx" ON "aula_studio"."messaggio_di_chat"("autoreId");
