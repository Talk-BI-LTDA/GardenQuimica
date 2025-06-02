/*
  Warnings:

  - A unique constraint covering the columns `[user_ns]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "email" TEXT,
ADD COLUMN     "origem" TEXT NOT NULL DEFAULT 'sistema',
ADD COLUMN     "user_ns" TEXT;

-- CreateTable
CREATE TABLE "EtiquetaCliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtiquetaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remarketing" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'agendado',
    "subFlowNs" TEXT NOT NULL DEFAULT 'f153643s1950233',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendedorId" TEXT NOT NULL,

    CONSTRAINT "Remarketing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemarketingCliente" (
    "id" TEXT NOT NULL,
    "remarketingId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemarketingCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EtiquetaCliente_nome_clienteId_key" ON "EtiquetaCliente"("nome", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "RemarketingCliente_remarketingId_clienteId_key" ON "RemarketingCliente"("remarketingId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_user_ns_key" ON "Cliente"("user_ns");

-- AddForeignKey
ALTER TABLE "EtiquetaCliente" ADD CONSTRAINT "EtiquetaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remarketing" ADD CONSTRAINT "Remarketing_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemarketingCliente" ADD CONSTRAINT "RemarketingCliente_remarketingId_fkey" FOREIGN KEY ("remarketingId") REFERENCES "Remarketing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemarketingCliente" ADD CONSTRAINT "RemarketingCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
