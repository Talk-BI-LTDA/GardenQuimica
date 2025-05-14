/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/forms/usuario-form.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { 
  Save, 
  X, 
  Loader2,
  User,
  Mail,
  Lock,
  CreditCard,
  UserCog
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { usuarioSchema } from '@/validations/usuario-schema'
import { UsuarioFormData } from '@/types/usuario'
import { criarUsuario, atualizarUsuario } from '@/actions/usuario-actions'

type UsuarioFormProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
  isEditing?: boolean
}

export function UsuarioForm({ initialData, isEditing = false }: UsuarioFormProps) {
  const [loading, setLoading] = useState(false)

  // Form
  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: initialData ? {
      ...initialData,
      senha: '',
      confirmacaoSenha: '',
    } : {
      nome: '',
      email: '',
      senha: '',
      confirmacaoSenha: '',
      cpf: '',
      role: 'VENDEDOR'
    }
  })

  // Manipular envio do formulário
  const onSubmit = async (data: UsuarioFormData) => {
    setLoading(true)

    try {
      const result = isEditing 
        ? await atualizarUsuario(initialData.id, data)
        : await criarUsuario(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!')
        
        if (!isEditing) {
          form.reset({
            nome: '',
            email: '',
            senha: '',
            confirmacaoSenha: '',
            cpf: '',
            role: 'VENDEDOR'
          })
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro ao processar o usuário')
    } finally {
      setLoading(false)
    }
  }

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
                    <Input {...field} placeholder="email@exemplo.com" type="email" />
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
                      // Máscara de CPF
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
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isEditing ? 'Nova Senha' : 'Senha*'}</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <Input {...field} placeholder="Digite a senha" type="password" />
                  </div>
                </FormControl>
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">Deixe em branco para manter a senha atual</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmacaoSenha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isEditing ? 'Confirmar Nova Senha' : 'Confirmar Senha*'}</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <Input {...field} placeholder="Confirme a senha" type="password" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button variant="outline" type="button">
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
                {isEditing ? 'Atualizar Usuário' : 'Cadastrar Usuário'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}