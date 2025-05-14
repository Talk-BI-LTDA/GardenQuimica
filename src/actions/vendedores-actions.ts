// src/actions/vendedores-actions.ts
'use server'
import { prisma } from '@/lib/supabase/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Usuario } from '@/types/usuario';

export type VendedorParams = {
  search?: string;
};

export async function getVendedores(params?: VendedorParams) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  // Construir filtros
  const where: Record<string, unknown> = { role: 'VENDEDOR' };

  // Se não for admin, só pode visualizar a si mesmo
  if (session.user.role !== 'ADMIN') {
    where.id = session.user.id;
  }

  // Aplicar busca
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  try {
    const vendedores = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Mapear para o tipo Usuario
    const vendedoresMapeados: Usuario[] = vendedores.map(vendedor => ({
      id: vendedor.id,
      nome: vendedor.name,
      email: vendedor.email,
      cpf: '', // Não estamos retornando CPF por segurança
      role: vendedor.role as 'ADMIN' | 'VENDEDOR',
      createdAt: new Date(), // Não estamos retornando a data real
      updatedAt: new Date(), // Não estamos retornando a data real
    }));

    return { success: true, vendedores: vendedoresMapeados };
  } catch (error) {
    console.error('Erro ao buscar vendedores:', error);
    return { error: 'Ocorreu um erro ao buscar os vendedores' };
  }
}

export async function getVendedor(id: string) {
  // Validar autenticação
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  // Se não for admin, só pode visualizar a si mesmo
  if (session.user.role !== 'ADMIN' && id !== session.user.id) {
    return { error: 'Você não tem permissão para visualizar este vendedor' };
  }

  try {
    const vendedor = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!vendedor) {
      return { error: 'Vendedor não encontrado' };
    }

    // Mapear para o tipo Usuario
    const vendedorMapeado: Usuario = {
      id: vendedor.id,
      nome: vendedor.name,
      email: vendedor.email,
      cpf: '', // Não estamos retornando CPF por segurança
      role: vendedor.role as 'ADMIN' | 'VENDEDOR',
      createdAt: vendedor.createdAt,
      updatedAt: vendedor.updatedAt,
    };

    return { success: true, vendedor: vendedorMapeado };
  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    return { error: 'Ocorreu um erro ao buscar o vendedor' };
  }
}