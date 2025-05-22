-- AlterTable
ALTER TABLE "NaoVendaProduto" DROP COLUMN IF EXISTS "recorrencia",
ADD COLUMN IF NOT EXISTS "infoNaoDisponivel" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "ipi" FLOAT;

-- AlterTable
ALTER TABLE "Produto" DROP COLUMN IF EXISTS "recorrencia",
ADD COLUMN IF NOT EXISTS "comissao" FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "icms" FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ipi" FLOAT DEFAULT 0;

-- AlterTable
ALTER TABLE "VendaProduto" DROP COLUMN IF EXISTS "recorrencia",
ADD COLUMN IF NOT EXISTS "comissao" FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "icms" FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ipi" FLOAT DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NaoVenda_createdAt_idx" ON "NaoVenda"("createdAt");
CREATE INDEX IF NOT EXISTS "NaoVenda_vendedorId_idx" ON "NaoVenda"("vendedorId");
CREATE INDEX IF NOT EXISTS "Venda_createdAt_idx" ON "Venda"("createdAt");
CREATE INDEX IF NOT EXISTS "Venda_vendedorId_idx" ON "Venda"("vendedorId");
CREATE INDEX IF NOT EXISTS "VendaProduto_vendaId_idx" ON "VendaProduto"("vendaId");