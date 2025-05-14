// src/validations/usuario-schema.ts
import { z } from 'zod';

export const usuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmacaoSenha: z.string(),
  cpf: z.string().min(11, 'CPF inválido'),
  role: z.enum(['ADMIN', 'VENDEDOR'])
}).refine((data) => data.senha === data.confirmacaoSenha, {
  message: 'Senhas não coincidem',
  path: ['confirmacaoSenha'],
});