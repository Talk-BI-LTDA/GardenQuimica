import { PrismaClient } from '@prisma/client';

// IMPORTANTE: Forçar uso do pooler mesmo que a URL esteja incorreta no .env
const databaseUrl = process.env.DATABASE_URL || '';

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