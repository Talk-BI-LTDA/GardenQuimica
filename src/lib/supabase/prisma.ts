import { PrismaClient } from '@prisma/client';

// IMPORTANTE: Forçar uso do pooler mesmo que a URL esteja incorreta no .env
let databaseUrl = process.env.DATABASE_URL || '';

// Verificação crítica: substituir URLs diretas por URLs de pooler
if (databaseUrl.includes('db.tgaijbqfnnmxpfvsqjlz.supabase.co')) {
  console.log('⚠️ Corrigindo URL para usar pooler...');
  databaseUrl = databaseUrl.replace(
    'db.tgaijbqfnnmxpfvsqjlz.supabase.co:5432',
    'aws-0-sa-east-1.pooler.supabase.com:6543'
  );
}

// Cliente Prisma com uso forçado da URL corrigida
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;