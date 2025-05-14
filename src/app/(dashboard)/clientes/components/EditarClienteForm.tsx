// app/(dashboard)/clientes/components/EditarClienteForm.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { atualizarCliente } from "@/actions/clientes-actions";
import { toast } from "sonner";
import { Cliente, ClienteParams } from "@/types/cliente";
import { z } from "zod";

interface EditarClienteFormProps {
  cliente: Cliente;
  segmentosDisponiveis: string[];
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

// Schema de validação com Zod
const clienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  segmento: z.string().min(1, "Segmento é obrigatório"),
  cnpj: z
    .string()
    .min(14, "CNPJ deve ter pelo menos 14 dígitos")
    .max(18, "CNPJ deve ter no máximo 18 caracteres"),
  razaoSocial: z.string().optional(),
});

const EditarClienteForm: React.FC<EditarClienteFormProps> = ({
  cliente,
  segmentosDisponiveis,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [formData, setFormData] = useState<ClienteParams>({
    nome: cliente.nome,
    segmento: cliente.segmento,
    cnpj: cliente.cnpj,
    razaoSocial: cliente.razaoSocial,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handler para mudanças nos campos de formulário
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo quando ele for editado
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handler para mudanças no Select de segmento
  const handleSegmentoChange = (value: string) => {
    setFormData((prev) => ({ ...prev, segmento: value }));
    
    // Limpar erro do campo quando ele for editado
    if (errors.segmento) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.segmento;
        return newErrors;
      });
    }
  };

  // Validar formulário antes de enviar
  const validarFormulario = (): boolean => {
    try {
      clienteSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handler para submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    
    try {
      const resultado = await atualizarCliente(cliente.id, formData);
      
      if (resultado.success) {
        toast.success("Cliente atualizado com sucesso");
        await onSubmit(); // Notificar componente pai do sucesso
      } else {
        toast.error(resultado.error || "Erro ao atualizar cliente");
      }
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Ocorreu um erro ao atualizar o cliente");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Nome do cliente"
            className={errors.nome ? "border-red-500" : ""}
          />
          {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            name="cnpj"
            value={formData.cnpj}
            onChange={handleChange}
            placeholder="00.000.000/0000-00"
            className={errors.cnpj ? "border-red-500" : ""}
          />
          {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="razaoSocial">Razão Social</Label>
          <Input
            id="razaoSocial"
            name="razaoSocial"
            value={formData.razaoSocial || ""}
            onChange={handleChange}
            placeholder="Razão social (opcional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="segmento">Segmento</Label>
          <Select
            value={formData.segmento}
            onValueChange={handleSegmentoChange}
          >
            <SelectTrigger
              id="segmento"
              className={errors.segmento ? "border-red-500" : ""}
            >
              <SelectValue placeholder="Selecione o segmento" />
            </SelectTrigger>
            <SelectContent>
              {segmentosDisponiveis.map((segmento) => (
                <SelectItem key={segmento} value={segmento}>
                  {segmento}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.segmento && (
            <p className="text-xs text-red-500">{errors.segmento}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#00446A] text-white hover:bg-[#00446A]/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Cliente"
          )}
        </Button>
      </div>
    </form>
  );
};

export default EditarClienteForm;