// src/lib/supabase/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Inicializar o cliente Prisma com as configurações básicas
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    }
  });
};

// Usar um singleton para evitar múltiplas conexões em desenvolvimento
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Salvar a referência global apenas em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}