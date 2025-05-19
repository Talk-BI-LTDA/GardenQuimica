// src/components/forms/usuario-edit-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Save,
  X,
  Loader2,
  User,
  Mail,
  Lock,
  CreditCard,
  UserCog,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  usuarioEditSchema,
  UsuarioEditFormValues,
  UsuarioEditProps,
} from "@/validations/usuario-schema";
import { atualizarUsuario } from "@/actions/usuario-actions";

// Lista de estados brasileiros
const estadosBrasileiros = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
];
const formatCPF = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numericValue = value.replace(/\D/g, "");

  // Aplica a máscara de CPF: 000.000.000-00
  return numericValue
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
    .substring(0, 14);
};
interface UsuarioEditFormProps {
  usuario: UsuarioEditProps;
}

export function UsuarioEditForm({ usuario }: UsuarioEditFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form configurado com o tipo inferido do Zod
  const form = useForm<UsuarioEditFormValues>({
    resolver: zodResolver(usuarioEditSchema),
    defaultValues: {
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      role: usuario.role,
      regiao: usuario.regiao || "",
      senha: "",
      confirmacaoSenha: "",
    },
  });

  // Manipular envio do formulário
  const onSubmit = async (values: UsuarioEditFormValues) => {
    setLoading(true);

    try {
      // Converter para o formato esperado pela API
      const formData = {
        nome: values.nome,
        email: values.email,
        cpf: values.cpf,
        role: values.role,
        regiao: values.regiao,
        senha:
          values.senha && values.senha.length > 0 ? values.senha : undefined,
        confirmacaoSenha:
          values.confirmacaoSenha && values.confirmacaoSenha.length > 0
            ? values.confirmacaoSenha
            : undefined,
      };

      const result = await atualizarUsuario(usuario.id, formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Usuário atualizado com sucesso!");
        router.push("/funcionarios");
        router.refresh();
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao atualizar o usuário");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome*</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <Input {...field} placeholder="Nome completo" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail*</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <Input
                      {...field}
                      placeholder="email@exemplo.com"
                      type="email"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF*</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <Input
                      {...field}
                      placeholder="000.000.000-00"
                      value={formatCPF(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                      maxLength={14}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Usuário*</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <UserCog className="w-4 h-4 text-gray-400" />
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="regiao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Região</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a região" />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosBrasileiros.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
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

          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova Senha</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <Input
                      {...field}
                      placeholder="Digite a nova senha"
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </FormControl>
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para manter a senha atual
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmacaoSenha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Nova Senha</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <Input
                      {...field}
                      placeholder="Confirme a nova senha"
                      type="password"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/funcionarios")}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Atualizar Usuário
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
