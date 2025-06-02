// @/types/cliente-talkbi.ts
export interface ClienteTalkBI {
    name?: string;
    user_ns?: string;
    user_id?: string;
    first_name?: string;
    last_name?: string;
    gender?: string;
    email?: string;
    phone?: string;
    locale?: string;
    language?: string;
    profile_pic?: string;
    subscribed?: string;
    opted_in_email?: string;
    opted_in_sms?: string;
    opted_in_through?: string;
    last_interaction?: string;
    last_seen?: string;
    last_message_at?: string;
    last_message_type?: string;
    tags?: {
      name: string;
      tag_ns: string;
    }[];
    user_fields?: {
      name: string;
      var_ns: string;
      var_type: string;
      description: string;
      value: string | number | boolean | Date;
    }[];
  }
  
  export interface ClienteTalkBICreate {
    first_name?: string;
    last_name?: string;
    name: string;
    phone?: string;
    email?: string;
    gender?: string;
    image?: string;
  }
  
  export interface TalkBIResponse {
    status?: string;
    message?: string;
    user_ns?: string;
  }
  
  export interface EnviarFluxoRequest {
    user_ns: string;
    sub_flow_ns: string;
  }
  
  // Tipos para remarketing
  export interface RemarketingForm {
    nome: string;
    dataAgendada: Date;
    clienteIds: string[];
    subFlowNs?: string;
  }
    
    
  export interface RemarketingDetalhes {
    id: string;
    nome: string;
    dataAgendada: Date;
    status: string;
    subFlowNs: string;
    createdAt: Date;
    updatedAt: Date;
    vendedorId: string;
    vendedorNome: string;
    totalClientes: number;
    totalEtiquetas: number;
    clientes: ClienteComEtiquetas[];
  }
  
  export interface ClienteComEtiquetas {
    id: string;
    nome: string;
    segmento: string;
    cnpj: string;
    razaoSocial: string | null;  
    whatsapp?: string;
    recorrente: boolean;
    origem: string;
    user_ns: string | null;
    email?: string;
    etiquetas: {
      id: string;
      nome: string;
    }[];
  }
  
  export interface RemarketingFiltros {
    status?: string;
    dataInicio?: Date;
    dataFim?: Date;
    vendedorId?: string;
    searchTerm?: string;
  }