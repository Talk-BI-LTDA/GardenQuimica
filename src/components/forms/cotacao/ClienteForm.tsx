// components/forms/cotacao/ClienteForm.tsx
"use client";

import { useState, useRef } from "react";
import {  UseFormReturn, FieldValues, Path } from "react-hook-form";
import { motion } from "framer-motion";
import { User, Building, Phone } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { VendaSchemaType } from "../venda-unificada-form";
import type { NaoVendaSchemaType } from "../venda-unificada-form";
import type { ModoFormulario } from "@/types/venda-tipos";
import type { ClienteRecorrente } from "@/types/venda-tipos";

// Lista de segmentos
const segmentoOptions = [
  "Home Care (Saneantes)",
  "Personal Care (Cosméticos)",
  "Plásticos, Borrachas e Papéis",
  "Pet",
  "Automotivo",
  "Alimentos",
  "Tratamento de Água",
  "Têxtil",
  "Especialidades",
  "Químicos",
  "Agro",
  "Farma",
  "Tintas e Vernizes",
  "Oil e Gás",
  "Lubrificantes",
];

// Função para formatar CNPJ
const formatCNPJ = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numericValue = value.replace(/\D/g, "");

  // Aplica a máscara de CNPJ: 00.000.000/0000-00
  return numericValue
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
};
const aplicarMascaraTelefone = (valor: string): string => {
  // Remove todos os caracteres não numéricos
  const apenasNumeros = valor.replace(/\D/g, '');
  
  // Aplica a máscara conforme a quantidade de dígitos
  if (apenasNumeros.length <= 2) {
    return apenasNumeros.replace(/^(\d{0,2})/, '($1');
  } else if (apenasNumeros.length <= 6) {
    return apenasNumeros.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  } else if (apenasNumeros.length <= 10) {
    return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else {
    // Para celular (11 dígitos)
    return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 16);
  }
};
interface ClienteFormProps {
  formMode: ModoFormulario;
  vendaForm: UseFormReturn<VendaSchemaType>;
  naoVendaForm: UseFormReturn<NaoVendaSchemaType>;
  clientesRecorrentes: ClienteRecorrente[];
  carregarClientesRecorrentes: () => Promise<void>;
  isLoadingClientes: boolean;

  isEditing: boolean;
  handleClienteRecorrenteChange: (idCliente: string) => void;
}

export function ClienteForm({
  formMode,
  vendaForm,
  naoVendaForm,
  clientesRecorrentes,
  isEditing,
  handleClienteRecorrenteChange,
  carregarClientesRecorrentes,
  isLoadingClientes
}: ClienteFormProps) {
  const [clienteSearchTerm, setClienteSearchTerm] = useState<string>("");
  const selectClienteRef = useRef<HTMLInputElement>(null);

  // Filtrar clientes baseado na busca
  const filteredClientes = clientesRecorrentes.filter(cliente => 
    cliente.nome.toLowerCase().includes(clienteSearchTerm.toLowerCase())
  );
  const handleSelectOpen = () => {
    carregarClientesRecorrentes();
  };
  // Função genérica para renderizar campo de cliente em ambos formulários
  const renderClienteField = <
    TFormValues extends FieldValues,
    TName extends Path<TFormValues>
  >(
    form: UseFormReturn<TFormValues>,
    fieldName: TName,
    label: string,
    placeholder: string,
    icon: React.ReactNode
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="flex items-center space-x-2">
              {icon}
              <Input {...field} placeholder={placeholder} />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Função genérica para renderizar campos de segmento em ambos formulários
  const renderSegmentoField = <
    TFormValues extends FieldValues,
    TName extends Path<TFormValues>
  >(
    form: UseFormReturn<TFormValues>,
    fieldName: TName
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Segmento da Empresa*</FormLabel>
          <FormControl>
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-gray-400" />
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {segmentoOptions.map((segmento) => (
                    <SelectItem key={segmento} value={segmento}>
                      {segmento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Função genérica para renderizar o campo CNPJ em ambos formulários
  const renderCnpjField = <
    TFormValues extends FieldValues,
    TName extends Path<TFormValues>
  >(
    form: UseFormReturn<TFormValues>,
    fieldName: TName
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>CNPJ*</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder="00.000.000/0000-00"
              value={formatCNPJ(field.value)}
              onChange={(e) => field.onChange(e.target.value)}
              maxLength={18}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Função genérica para renderizar o campo de razão social em ambos formulários
  const renderRazaoSocialField = <
    TFormValues extends FieldValues,
    TName extends Path<TFormValues>
  >(
    form: UseFormReturn<TFormValues>,
    fieldName: TName
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Razão Social</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder="Razão social (opcional)"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const renderWhatsAppField  = <
    TFormValues extends FieldValues,
    TName extends Path<TFormValues>
  >(
    form: UseFormReturn<TFormValues>,
    fieldName: TName
  ) => (
  <FormField
    control={form.control}
    name={fieldName}
    render={({ field }) => (
      <FormItem>
        <FormLabel>WhatsApp</FormLabel>
        <FormControl>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="(00) 00000-0000"
              value={field.value || ""}
              onChange={(e) => {
                const maskedValue = aplicarMascaraTelefone(e.target.value);
                field.onChange(maskedValue);
              }}
            />
          </div>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);
  return (
    <>
       {!isEditing && (
        <motion.div
          className="bg-gray-50 p-4 rounded-lg"
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          <h3 className="text-lg font-medium mb-4">
            Cliente Recorrente
          </h3>
          <div>
            <Select onValueChange={handleClienteRecorrenteChange} onOpenChange={handleSelectOpen}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingClientes ? "Carregando clientes..." : "Selecione um cliente recorrente"} />
              </SelectTrigger>
              <SelectContent>
                <div className="px-3 py-2">
                  <Input 
                    placeholder="Buscar cliente..." 
                    value={clienteSearchTerm}
                    onChange={(e) => setClienteSearchTerm(e.target.value)}
                    ref={selectClienteRef}
                    className="mb-2"
                  />
                </div>
                {isLoadingClientes ? (
                  <div className="p-2 text-center text-gray-500">Carregando...</div>
                ) : (
                  filteredClientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Selecione um cliente recorrente para preencher
            automaticamente os dados
          </p>
        </motion.div>
      )}

      {/* Informações do Cliente */}
      <motion.div
        initial={{ opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
      >
        <h3 className="text-lg font-medium mb-4">
          Informações do Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formMode === "venda" ? (
            // Campos para formulário de venda
            <>
              {renderClienteField(
                vendaForm, 
                "cliente.nome" as Path<VendaSchemaType>, 
                "Nome do Cliente*", 
                "Nome do cliente", 
                <User className="w-4 h-4 text-gray-400" />
              )}
              {renderSegmentoField(vendaForm, "cliente.segmento" as Path<VendaSchemaType>)}
              {renderCnpjField(vendaForm, "cliente.cnpj" as Path<VendaSchemaType>)}
              {renderRazaoSocialField(vendaForm, "cliente.razaoSocial" as Path<VendaSchemaType>)}
              {renderWhatsAppField(vendaForm, "cliente.whatsapp" as Path<VendaSchemaType>)}

            </>
          ) : (
            // Campos para formulário de não venda
            <>
              {renderClienteField(
                naoVendaForm, 
                "cliente.nome" as Path<NaoVendaSchemaType>, 
                "Nome do Cliente*", 
                "Nome do cliente", 
                <User className="w-4 h-4 text-gray-400" />
              )}
              {renderSegmentoField(naoVendaForm, "cliente.segmento" as Path<NaoVendaSchemaType>)}
              {renderCnpjField(naoVendaForm, "cliente.cnpj" as Path<NaoVendaSchemaType>)}
              {renderRazaoSocialField(naoVendaForm, "cliente.razaoSocial" as Path<NaoVendaSchemaType>)}
              {renderWhatsAppField(naoVendaForm, "cliente.whatsapp" as Path<NaoVendaSchemaType>)}

            </>
          )}
        </div>
      </motion.div>
    </>
  );
}