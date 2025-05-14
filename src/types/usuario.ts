// src/types/usuario.ts
export type UsuarioRole = 'ADMIN' | 'VENDEDOR';

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  role: UsuarioRole;
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
};