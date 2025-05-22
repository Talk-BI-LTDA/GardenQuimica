// src/types/usuario-tipos.ts
export type UsuarioRole = 'ADMIN' | 'VENDEDOR';

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  role: UsuarioRole;
  regiao?: string;  
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  editedById?: string;
};

export type UsuarioFormData = {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
  cpf: string;
  role: UsuarioRole;
  regiao?: string;  
};

export type UsuarioEditFormData = {
  nome: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
  cpf: string;
  role: UsuarioRole;
  regiao?: string;  
};

export type Cliente = {
  id?: string;
  nome: string;
  segmento: string;
  cnpj: string;
  razaoSocial?: string;
  recorrente?: boolean;
  whatsapp?: string;
};

export type Vendedor = {
  id: string;
  nome: string;
  email?: string;
  clientes?: Cliente[];
};