// src/app/api/etiquetas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    console.log("API de etiquetas: iniciando busca");

    // Buscar todas as etiquetas únicas diretamente da tabela EtiquetaCliente
    const etiquetas = await prisma.etiquetaCliente.findMany({
      select: {
        id: true,
        nome: true,
        clienteId: true
      }
    });

    console.log(`API: Encontradas ${etiquetas.length} etiquetas no total`);

    // Obter etiquetas únicas (removendo duplicatas pelo nome)
    const etiquetasUnicas = Array.from(
      new Map(etiquetas.map(item => [item.nome, item])).values()
    );

    console.log(`API: ${etiquetasUnicas.length} etiquetas únicas após remoção de duplicatas`);
    
    // Mostrar as primeiras etiquetas para debug
    if (etiquetasUnicas.length > 0) {
      console.log("API: Exemplos de etiquetas:", 
        etiquetasUnicas.slice(0, 5).map(e => e.nome));
    }

    return NextResponse.json({
      success: true,
      etiquetas: etiquetasUnicas,
      totalRegistros: etiquetas.length
    });
  } catch (error) {
    console.error('Erro ao buscar etiquetas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar etiquetas' },
      { status: 500 }
    );
  }
}