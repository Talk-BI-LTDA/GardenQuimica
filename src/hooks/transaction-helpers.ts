// src/lib/transaction-helpers.ts
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/supabase/prisma';

export async function executeTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await fn(tx as unknown as PrismaClient);
    });
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Erro na transação:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Ocorreu um erro desconhecido';
    
    return { success: false, error: errorMessage };
  }
}