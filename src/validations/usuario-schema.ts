// src/validations/usuario-schema.ts
import { z } from 'zod';
import { UsuarioRole } from '@/types/usuario'; // Importando o tipo UsuarioRole

// Lista de estados brasileiros para validação
const estadosBrasileiros = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", 
  "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", 
  "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", 
  "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", 
  "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", 
  "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
];

export const usuarioSchema = z.object({
  nome: z.string().min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  senha: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
  confirmacaoSenha: z.string(),
  cpf: z.string().min(1, { message: 'CPF é obrigatório' }),
  role: z.enum(['ADMIN', 'VENDEDOR']),
  regiao: z.string().refine(val => val === '' || estadosBrasileiros.includes(val), {
    message: 'Selecione uma região válida'
  }).optional(),
}).refine((data) => data.senha === data.confirmacaoSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmacaoSenha'],
});

export const usuarioEditSchema = z.object({
  nome: z
    .string()
    .min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  email: z
    .string()
    .email({ message: 'Email inválido' }),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, { message: 'CPF inválido' }),
  role: z.enum(['ADMIN', 'VENDEDOR']),
  regiao: z.string().optional(),
  senha: z
    .string()
    .min(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
    .optional()
    .or(z.literal('')),
  confirmacaoSenha: z
    .string()
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Se senha está vazia, confirmação também deve estar
    if (!data.senha && !data.confirmacaoSenha) return true;
    // Se apenas uma está vazia, deve haver erro
    if (!data.senha || !data.confirmacaoSenha) return false;
    // Se ambas estão preenchidas, devem coincidir
    return data.senha === data.confirmacaoSenha;
  }, 
  {
    message: 'As senhas não coincidem',
    path: ['confirmacaoSenha'],
  }
);

// Tipo inferido do esquema de edição
export type UsuarioEditFormValues = z.infer<typeof usuarioEditSchema>;

// Interface para os dados que vêm do backend
export interface UsuarioEditProps {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  role: UsuarioRole;
  regiao?: string | null; // Alterado para aceitar null
}