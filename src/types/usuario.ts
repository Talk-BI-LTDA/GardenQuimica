// src/types/usuario.ts
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

