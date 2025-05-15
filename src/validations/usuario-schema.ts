// src/validations/usuario-schema.ts
import { z } from 'zod';

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