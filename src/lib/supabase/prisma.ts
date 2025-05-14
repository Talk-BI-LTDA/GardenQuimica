import { PrismaClient } from '@prisma/client';

// Singleton com configurações específicas para Supabase
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Adicione esta configuração para tentar corrigir o problema
    // específico de prepared statements
    // Adicione também um timeout mais longo para as transações
    transactionOptions: {
      maxWait: 10000, // 10 segundos
      timeout: 15000, // 15 segundos
    }
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Adicione esta linha para acompanhamento em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Prisma client instance created or reused');
}