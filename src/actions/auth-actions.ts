// src/actions/auth-actions.ts
'use server'

import { cookies } from 'next/headers';
import { prisma } from '@/lib/supabase/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email-service';

// Tipos bem definidos
type LoginCredentials = {
  email: string;
  senha: string;
  lembrar: boolean;
};

type AuthResult = {
  success: boolean;
  error?: string;
};

/**
 * Função de login aprimorada
 */
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true
      }
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado" };
    }

    // Verificar senha
    const passwordValid = await bcrypt.compare(credentials.senha, user.password);
    if (!passwordValid) {
      return { success: false, error: "Senha incorreta" };
    }

    // Criar sessão
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Definir tempo de expiração
    const expirationTime = credentials.lembrar 
      ? 30 * 24 * 60 * 60 * 1000 // 30 dias
      : 24 * 60 * 60 * 1000;     // 1 dia
    
    const expires = new Date(Date.now() + expirationTime);

    // Método correto para definir cookies no Next.js
    (await cookies()).set({
      name: 'session',
      value: JSON.stringify(userData),
      expires,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return { success: true };
  } catch (error) {
    console.error("Erro no login:", error);
    return { success: false, error: "Falha na autenticação" };
  } finally {
    await prisma.$disconnect();
  }
}
/**
 * Função de logout
 */
export async function logout(): Promise<AuthResult> {
  try {
    (await cookies()).delete('session');
    return { success: true };
  } catch (error) {
    console.error("Erro no logout:", error);
    return { success: false, error: "Falha ao encerrar sessão" };
  }
}

/**
 * Requisitar redefinição de senha com geração de token temporário
 */
export async function requestPasswordReset(email: string, cpf: string): Promise<AuthResult> {
  try {
    // Verificar se o usuário existe
    const user = await prisma.user.findFirst({
      where: {
        email,
        cpf
      }
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado" };
    }

    // Gerar token aleatório
    const token = crypto.randomBytes(3).toString('hex').toUpperCase(); // Token de 6 caracteres
    
    // Definir tempo de expiração (1 hora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Remover tokens antigos para este email
    await prisma.passwordReset.deleteMany({
      where: { email }
    });
    
    // Armazenar o token no banco de dados
    await prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt
      }
    });
    
    // Criar conteúdo do email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo-garden.png" alt="Garden Química" style="max-width: 150px;">
        </div>
        <h2 style="color: #00446A; text-align: center;">Redefinição de Senha</h2>
        <p>Olá,</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Seu código de verificação é:</p>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${token}
        </div>
        <p>Este código é válido por 1 hora. Se você não solicitou esta redefinição, por favor ignore este email.</p>
        <p>Atenciosamente,<br>Equipe Garden Química</p>
      </div>
    `;

    // Enviar email com o token
    const emailSent = await sendEmail({
      to: email,
      subject: "Redefinição de Senha - Garden Química",
      text: `Seu código de verificação é: ${token}. Válido por 1 hora.`,
      html: emailHtml
    });

    if (!emailSent) {
      // Se o email falhar, ainda podemos mostrar o token em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`Token para ${email}: ${token}`);
        return { success: true };
      }
      return { success: false, error: "Falha ao enviar email de recuperação" };
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return { success: false, error: "Falha ao processar solicitação" };
  }
}

/**
 * Verificar token de redefinição de senha
 */
export async function verifyPasswordResetToken(email: string, token: string): Promise<AuthResult> {
  try {
    // Buscar token no banco de dados
    const resetData = await prisma.passwordReset.findUnique({
      where: { email }
    });
    
    if (!resetData) {
      return { success: false, error: "Nenhuma solicitação de redefinição encontrada" };
    }
    
    // Verificar se token expirou
    if (new Date() > resetData.expiresAt) {
      // Limpar token expirado
      await prisma.passwordReset.delete({
        where: { email }
      });
      return { success: false, error: "Token expirado. Solicite um novo." };
    }
    
    // Verificar se token está correto - COMPARAÇÃO RIGOROSA
    if (token !== resetData.token) {
      return { success: false, error: "Token inválido" };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    return { success: false, error: "Falha ao verificar token" };
  }
}

/**
 * Redefinir senha
 */
export async function resetPassword(email: string, newPassword: string): Promise<AuthResult> {
  try {
    // Verificar se existe um token válido
    const resetData = await prisma.passwordReset.findUnique({
      where: { email }
    });
    
    if (!resetData) {
      return { success: false, error: "Nenhuma solicitação de redefinição válida encontrada" };
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado" };
    }
    
    // Gerar hash da senha usando bcrypt - mesmo método do login
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
      
    // Remover token após uso
    await prisma.passwordReset.delete({
      where: { email }
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return { success: false, error: "Falha ao redefinir senha" };
  }
}