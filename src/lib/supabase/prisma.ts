// src/lib/supabase/prisma.ts
import { PrismaClient } from '@prisma/client';

// Definir DATABASE_URL como uma constante para debug
const DATABASE_URL = process.env.DATABASE_URL ||
  "postgresql://postgres.fkwvvvlnrpumbuzeocdr:DtkmVjvRtbYAsCxg@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

// Log para debug - remover em produção
console.log("Conexão Prisma: URL está definida?", !!DATABASE_URL);

const createPrismaClient = () => {
  // Verificar se a URL está definida para evitar erro
  if (!DATABASE_URL) {
    console.error('DATABASE_URL não definida no ambiente');
    // Em vez de lançar erro, usar uma URL de fallback (apenas para desenvolvimento)
    // Em produção, você deve garantir que a variável de ambiente esteja definida
    return new PrismaClient({
      datasources: {
        db: {
          url: "postgresql://postgres.fkwvvvlnrpumbuzeocdr:DtkmVjvRtbYAsCxg@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1",
        },
      },
    });
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Usar um try-catch para evitar falhas durante a inicialização
let prismaInstance: PrismaClientSingleton;
try {
  prismaInstance = globalForPrisma.prisma ?? createPrismaClient();
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
} catch (error) {
  console.error("Erro ao inicializar Prisma:", error);
  // Criar uma instância com configurações padrão
  prismaInstance = new PrismaClient();
}

export const prisma = prismaInstance;

export async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar Prisma:', error);
    throw error;
  }
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}