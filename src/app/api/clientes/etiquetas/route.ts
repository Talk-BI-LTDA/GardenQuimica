// src/app/api/clientes/etiquetas/route.ts
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

    console.log("API clientes/etiquetas: Iniciando busca de clientes com suas etiquetas");

    // Buscar clientes com suas etiquetas
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
        EtiquetaCliente: {
          select: {
            id: true,
            nome: true
          }
        }
      },
      where: {
        EtiquetaCliente: {
          some: {} // Apenas clientes que tenham alguma etiqueta
        }
      },
      take: 10 // Limitar para não sobrecarregar
    });

    console.log(`API: Encontrados ${clientes.length} clientes com etiquetas`);

    // Verificar e logar a estrutura dos dados
    if (clientes.length > 0) {
      const clienteExemplo = clientes[0];
      console.log(`Exemplo - Cliente: ${clienteExemplo.nome} (ID: ${clienteExemplo.id})`);
      console.log(`Etiquetas do cliente exemplo:`, 
        clienteExemplo.EtiquetaCliente.map(e => `${e.nome} (${e.id})`));
    }

    return NextResponse.json({
      success: true,
      clientes
    });
  } catch (error) {
    console.error('Erro ao buscar clientes com etiquetas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar clientes com etiquetas' },
      { status: 500 }
    );
  }
}