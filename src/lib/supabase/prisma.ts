// src/lib/optimizations/prisma-client.ts
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../optimizations/logger';

const logger = createLogger('PrismaClient');

// Configuração global do cliente Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Opções de configuração do Prisma para ambiente de produção vs desenvolvimento
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // Configurações avançadas para otimização de conexões
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Configuração de pool de conexões para alta carga
    connection: {
      options: {
        min: 3,          // Mínimo de conexões no pool
        max: 15,         // Máximo de conexões no pool
        idle_timeout: 30 // Tempo de expiração para conexões ociosas (segundos)
      }
    } as never
  });
};

// Singleton pattern para reutilização de conexão entre requisições
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Executar transações com tratamento de erro incorporado
export async function runWithTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>,
  retries = 2
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      return await callback(tx as unknown as PrismaClient);
    });
  } catch (error) {
    if (retries > 0 && shouldRetryTransaction(error)) {
      logger.warn(`Transação falhou, tentando novamente. Tentativas restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms antes de tentar novamente
      return runWithTransaction(callback, retries - 1);
    }
    throw error;
  }
}

// Função para identificar erros que podem ser resolvidos com uma nova tentativa
function shouldRetryTransaction(error: unknown): boolean {
  const errorMessage = String(error);
  return (
    errorMessage.includes("prepared statement") || 
    errorMessage.includes("invalid buffer size") ||
    errorMessage.includes("connection lost") ||
    errorMessage.includes("Connection terminated unexpectedly")
  );
}

// Garantir que em desenvolvimento o Prisma não recarregue conexões desnecessariamente
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;