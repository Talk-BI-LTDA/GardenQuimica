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
    // Adicione também um timeout mais longo para as transações
    transactionOptions: {
      maxWait: 10000, // 10 segundos
      timeout: 15000, // 15 segundos
    }
  });
};
const authPrisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DIRECT_URL // Use a conexão direta para auth
    }
  }
});
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};
export { authPrisma };
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Adicione esta linha para acompanhamento em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Prisma client instance created or reused');
}
