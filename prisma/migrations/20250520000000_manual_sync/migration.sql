-- Remoção da coluna recorrencia
-- (Já foi removida via db push, então apenas documentamos)
-- ALTER TABLE "NaoVendaProduto" DROP COLUMN IF EXISTS "recorrencia";
-- ALTER TABLE "Produto" DROP COLUMN IF EXISTS "recorrencia";
-- ALTER TABLE "VendaProduto" DROP COLUMN IF EXISTS "recorrencia";

-- Adição dos novos campos (já adicionados via db push)
-- ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "comissao" FLOAT DEFAULT 0;
-- ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "icms" FLOAT DEFAULT 0;
-- ALTER TABLE "Produto" ADD COLUMN IF NOT EXISTS "ipi" FLOAT DEFAULT 0;

-- ALTER TABLE "VendaProduto" ADD COLUMN IF NOT EXISTS "comissao" FLOAT DEFAULT 0;
-- ALTER TABLE "VendaProduto" ADD COLUMN IF NOT EXISTS "icms" FLOAT DEFAULT 0;
-- ALTER TABLE "VendaProduto" ADD COLUMN IF NOT EXISTS "ipi" FLOAT DEFAULT 0;

-- ALTER TABLE "NaoVendaProduto" ADD COLUMN IF NOT EXISTS "ipi" FLOAT;
-- ALTER TABLE "NaoVendaProduto" ADD COLUMN IF NOT EXISTS "infoNaoDisponivel" BOOLEAN DEFAULT false;

-- Adição dos índices
-- CREATE INDEX IF NOT EXISTS "Venda_createdAt_idx" ON "Venda"("createdAt");
-- CREATE INDEX IF NOT EXISTS "Venda_vendedorId_idx" ON "Venda"("vendedorId");
-- CREATE INDEX IF NOT EXISTS "NaoVenda_createdAt_idx" ON "NaoVenda"("createdAt");
-- CREATE INDEX IF NOT EXISTS "NaoVenda_vendedorId_idx" ON "NaoVenda"("vendedorId");
-- CREATE INDEX IF NOT EXISTS "VendaProduto_vendaId_idx" ON "VendaProduto"("vendaId");

-- Esta migração está comentada porque as mudanças já foram aplicadas via db push
-- Serve apenas como documentação e para sincronizar o estado do Prisma