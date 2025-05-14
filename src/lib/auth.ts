// src/lib/auth.ts
import { cookies } from 'next/headers';
import { prisma } from '@/lib/supabase/prisma';
import { cache } from 'react';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Session = {
  user: SessionUser;
};

/**
 * Função de autenticação otimizada para resolver problemas de conexão
 */
export const auth = cache(async (): Promise<Session | null> => {
  try {
    const sessionCookie = (await cookies()).get('session');
    
    if (!sessionCookie?.value) {
      return null;
    }
    
    try {
      // Validar sessão
      const userData = JSON.parse(sessionCookie.value) as {id?: string; name?: string; email?: string; role?: string};
      
      if (!userData?.id) {
        return null;
      }

      // Usar uma estratégia mais robusta para buscar o usuário
      try {
        const user = await prisma.user.findFirst({
          where: { 
            id: userData.id 
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });
        
        if (!user) {
          return null;
        }
        
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
      } catch (dbError) {
        // Tratar o erro específico do Prisma
        const errorMessage = String(dbError);
        
        if (errorMessage.includes('prepared statement') || errorMessage.includes('26000')) {
          console.log("Detectado erro de prepared statement, reconectando...");
          
          // Forçar desconexão e reconexão
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            // Nova tentativa com conexão reestabelecida
            const user = await prisma.user.findFirst({
              where: { id: userData.id },
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            });
            
            if (!user) {
              return null;
            }
            
            return {
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
              }
            };
          } catch (retryError) {
            console.error("Falha na nova tentativa:", retryError);
            return null;
          }
        }
        
        console.error("Erro na consulta ao banco:", dbError);
        return null;
      }
    } catch (parseError) {
      console.error("Erro ao processar cookie de sessão:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return null;
  }
});