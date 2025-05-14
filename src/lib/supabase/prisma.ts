// src/lib/supabase/prisma.ts
import { PrismaClient } from '@prisma/client';

// Esta abordagem evita múltiplas instâncias durante hot-reloading em desenvolvimento
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = 
  globalForPrisma.prisma || 
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;