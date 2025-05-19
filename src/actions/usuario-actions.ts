  // src/actions/usuario-actions.ts
  'use server'

  import { revalidatePath } from 'next/cache';
  import { redirect } from 'next/navigation';
  import { prisma } from '@/lib/supabase/prisma';
  import { auth } from '@/lib/auth';
  import { hash } from 'bcryptjs';
  import { UsuarioFormData,UsuarioRole  } from '@/types/usuario';
  import { usuarioSchema } from '@/validations/usuario-schema';
  export interface UsuarioUpdateData {
    nome: string;
    email: string;
    cpf: string;
    role: UsuarioRole;
    regiao?: string;
    senha?: string;
    confirmacaoSenha?: string;
  }
  export async function criarUsuario(data: UsuarioFormData) {
    // Validar autenticação
    const session = await auth();
    
    if (!session) {
      return { error: 'Você precisa estar autenticado para realizar esta ação' };
    }

    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      return { error: 'Apenas administradores podem cadastrar usuários' };
    }

    // Validar dados
    const validatedFields = usuarioSchema.safeParse(data);
    
    if (!validatedFields.success) {
      return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
    }

    try {
      // Verificar se email já existe
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingEmail) {
        return { error: 'Este email já está em uso' };
      }

      // Verificar se CPF já existe
      const existingCPF = await prisma.user.findUnique({
        where: { cpf: data.cpf },
      });

      if (existingCPF) {
        return { error: 'Este CPF já está em uso' };
      }

      // Hash da senha
      const hashedPassword = await hash(data.senha, 10);

      // Criar usuário
      const usuario = await prisma.user.create({
        data: {
          name: data.nome,
          email: data.email,
          password: hashedPassword,
          cpf: data.cpf,
          role: data.role,
          regiao: data.regiao,
          createdById: session.user.id,
        },
      });

      revalidatePath('/dashboard/funcionarios');
      return { success: true, id: usuario.id };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { error: 'Ocorreu um erro ao cadastrar o usuário' };
    }
  }

  export async function getUsuarioS(id: string) {
    // Validar autenticação
    const session = await auth();
    
    if (!session) {
      redirect('/login');
    }

    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      redirect('/dashboard/painel');
    }

    try {
      const usuario = await prisma.user.findUnique({
        where: { id }
      });

      if (!usuario) {
        return { error: 'Usuário não encontrado' };
      }

      return { 
        success: true, 
        usuario: {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          cpf: usuario.cpf,
          role: usuario.role,
          regiao: usuario.regiao, // Campo região incluído
        } 
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return { error: 'Ocorreu um erro ao buscar o usuário' };
    }
  }

  export async function getUsuario(id: string) {
    // Validar autenticação
    const session = await auth();
    
    if (!session) {
      redirect('/login');
    }
   
    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      redirect('/dashboard/painel');
    }

    try {
      const usuario = await prisma.user.findUnique({
        where: { id }
      });

      if (!usuario) {
        return { error: 'Usuário não encontrado' };
      }

      return { 
        success: true, 
        usuario: {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          cpf: usuario.cpf,
          role: usuario.role,
        } 
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return { error: 'Ocorreu um erro ao buscar o usuário' };
    }
  }

  export async function atualizarUsuario(id: string, data: UsuarioUpdateData) {
    // Validar autenticação
    const session = await auth();
    
    if (!session) {
      return { error: 'Você precisa estar autenticado para realizar esta ação' };
    }
  
    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      return { error: 'Apenas administradores podem editar usuários' };
    }
  
    // Validar dados
    try {
      // Verificar se o usuário existe
      const usuarioExistente = await prisma.user.findUnique({
        where: { id }
      });
  
      if (!usuarioExistente) {
        return { error: 'Usuário não encontrado' };
      }
  
      // Verificar se email já existe (exceto o próprio usuário)
      const existingEmail = await prisma.user.findFirst({
        where: { 
          email: data.email,
          id: { not: id }
        },
      });
  
      if (existingEmail) {
        return { error: 'Este email já está em uso' };
      }
  
      // Verificar se CPF já existe (exceto o próprio usuário)
      const existingCPF = await prisma.user.findFirst({
        where: { 
          cpf: data.cpf,
          id: { not: id }
        },
      });
  
      if (existingCPF) {
        return { error: 'Este CPF já está em uso' };
      }
  
      // Dados para atualização
      const updateData: Record<string, unknown> = {
        name: data.nome,
        email: data.email,
        cpf: data.cpf,
        role: data.role,
        regiao: data.regiao, 
        editedById: session.user.id,
      };
  
      // Se a senha foi fornecida, atualizar senha
      if (data.senha) {
        updateData.password = await hash(data.senha, 10);
      }
  
      // Atualizar usuário
      await prisma.user.update({
        where: { id },
        data: updateData,
      });
  
      // Importante: Certifique-se que este caminho está correto!
      revalidatePath('/dashboard/funcionarios');
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return { error: 'Ocorreu um erro ao atualizar o usuário' };
    }
  }

  export async function excluirUsuario(id: string) {
    // Validar autenticação
    const session = await auth();
    
    if (!session) {
      return { error: 'Você precisa estar autenticado para realizar esta ação' };
    }

    // Verificar se é admin
    if (session.user.role !== 'ADMIN') {
      return { error: 'Apenas administradores podem excluir usuários' };
    }

    try {
      // Verificar se não está excluindo a si mesmo
      if (id === session.user.id) {
        return { error: 'Você não pode excluir seu próprio usuário' };
      }

      // Excluir usuário
      await prisma.user.delete({
        where: { id }
      });

      revalidatePath('/dashboard/funcionarios');
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      return { error: 'Ocorreu um erro ao excluir o usuário. Verifique se não há registros associados a este usuário.' };
    }
  }