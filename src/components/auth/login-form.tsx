/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogIn,
  Mail,
  Lock,
  User,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import logo from '../../app/assets/logo-garden.png';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

import { login, requestPasswordReset } from "@/actions/auth-actions";
type UserData = {
  email: string;
  cpf: string;
  name?: string;
};
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
  lembrar: z.boolean().default(false),
});

const resetSchema = z.object({
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF inválido"),
});

const tokenSchema = z.object({
  token: z.string().min(6, "Token inválido"),
});

const newPasswordSchema = z
  .object({
    senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmacaoSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmacaoSenha, {
    message: "Senhas não coincidem",
    path: ["confirmacaoSenha"],
  });

type FormState = "login" | "reset" | "token" | "new-password";

export function LoginForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>("login");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      senha: "",
      lembrar: false,
    },
  });

  // Reset password form
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
      cpf: "",
    },
  });

  // Token form
  const tokenForm = useForm<z.infer<typeof tokenSchema>>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      token: "",
    },
  });

  // New password form
  const newPasswordForm = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      senha: "",
      confirmacaoSenha: "",
    },
  });

  // Handle login
  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    setLoading(true);

    try {
      const result = await login(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Login realizado com sucesso!");
        router.push("/painel");
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password request
  const onResetSubmit = async (data: z.infer<typeof resetSchema>) => {
    setLoading(true);

    try {
      const result = await requestPasswordReset(data.email, data.cpf);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Solicitação enviada com sucesso! Verifique seu email.");
        setUserData({
          email: data.email,
          cpf: data.cpf,
        });
        setFormState("token");
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao solicitar redefinição de senha");
    } finally {
      setLoading(false);
    }
  };

  // Handle token validation
  const onTokenSubmit = async (data: z.infer<typeof tokenSchema>) => {
    setLoading(true);

    try {
      // Simulação de validação de token
      setTimeout(() => {
        setFormState("new-password");
        setLoading(false);
      }, 1000);
    } catch (error) {
      toast.error("Token inválido");
      setLoading(false);
    }
  };

  // Handle new password
  const onNewPasswordSubmit = async (
    data: z.infer<typeof newPasswordSchema>
  ) => {
    setLoading(true);

    try {
      // Simulação de redefinição de senha
      setTimeout(() => {
        toast.success(
          "Senha redefinida com sucesso! Faça login com sua nova senha."
        );
        setFormState("login");
        setLoading(false);
      }, 1000);
    } catch (error) {
      toast.error("Ocorreu um erro ao redefinir a senha");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md ">
      <div className="mb-8 flex justify-center text-center">
      <img src={logo.src} alt="logo" width={175} height={175} />
      </div>
      <div className="bg-black/50 backdrop-blur-1xl text-white p-8 rounded-lg shadow-lg overflow-hidden">
        <AnimatePresence mode="wait">
          {formState === "login" && (
            <motion.div
              key="login"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1], // Ease out cubic - mais suave e rápido
              }}
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              {...field}
                              placeholder="seu.email@exemplo.com"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="senha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              {...field}
                              type="password"
                              placeholder="********"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-5 justify-between">
                    <FormField
                      control={loginForm.control}
                      name="lembrar"
                      render={({ field }) => (
                        <FormItem className="flex items-center ">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Lembrar de mim
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <Button
                      variant="link"
                      className="px-0 text-sm font-medium text-[#00446A]"
                      type="button"
                      onClick={() => setFormState("reset")}
                    >
                      Esqueceu sua senha?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#00446A] hover:bg-[#00446A]/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Entrar
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {formState === "reset" && (
            <motion.div
              key="reset"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormState("login")}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold">Recuperar Senha</h2>
              </div>

              <p className="mb-6 text-sm text-gray-600">
                Digite seu email e CPF para enviarmos um token de recuperação.
              </p>

              <Form {...resetForm}>
                <form
                  onSubmit={resetForm.handleSubmit(onResetSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              {...field}
                              placeholder="seu.email@exemplo.com"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
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

                  <Button
                    type="submit"
                    className="w-full bg-[#00446A] hover:bg-[#00446A]/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Token"
                    )}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {formState === "token" && (
            <motion.div
              key="token"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1], // Ease out cubic - mais suave e rápido
              }}
            >
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormState("reset")}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold">Verificar Token</h2>
              </div>

              <p className="mb-6 text-sm text-gray-600">
                Enviamos um token para seu email. Digite-o abaixo para
                continuar.
              </p>

              <Form {...tokenForm}>
                <form
                  onSubmit={tokenForm.handleSubmit(onTokenSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={tokenForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Digite o token recebido"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#00446A] hover:bg-[#00446A]/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Verificar Token"
                    )}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {formState === "new-password" && (
            <motion.div
              key="new-password"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0.0, 0.2, 1], // Ease out cubic - mais suave e rápido
              }}
            >
              <div className="flex items-center mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormState("token")}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold">Nova Senha</h2>
              </div>

              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Usuário:</span>{" "}
                    {userData?.email}
                  </p>
                </div>
              </div>

              <Form {...newPasswordForm}>
                <form
                  onSubmit={newPasswordForm.handleSubmit(onNewPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={newPasswordForm.control}
                    name="senha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              {...field}
                              type="password"
                              placeholder="Digite a nova senha"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={newPasswordForm.control}
                    name="confirmacaoSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              {...field}
                              type="password"
                              placeholder="Confirme a nova senha"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#00446A] hover:bg-[#00446A]/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Nova Senha"
                    )}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
