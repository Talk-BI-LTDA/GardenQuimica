// src/components/auth/reset-password-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import {
  Mail,
  CreditCard,
  Lock,
  ArrowLeft,
  CheckCircle,
  Loader2,
} from "lucide-react";
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

import { requestPasswordReset, verifyPasswordResetToken, resetPassword } from "@/actions/auth-actions";

// Definição dos schemas para cada etapa
const requestResetSchema = z.object({
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

// Tipos para cada etapa
type RequestResetFormData = z.infer<typeof requestResetSchema>;
type TokenFormData = z.infer<typeof tokenSchema>;
type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

// Etapas do formulário
type FormStep = "request" | "token" | "newPassword" | "success";

// Dados do usuário para manter entre as etapas
interface UserInfo {
  email: string;
  cpf: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FormStep>("request");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({ email: "", cpf: "" });

  // Formulário de solicitação de reset
  const requestForm = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: "",
      cpf: "",
    },
  });

  // Formulário de token
  const tokenForm = useForm<TokenFormData>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      token: "",
    },
  });

  // Formulário de nova senha
  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      senha: "",
      confirmacaoSenha: "",
    },
  });

  // Manipular solicitação de reset
  const onRequestSubmit = async (data: RequestResetFormData) => {
    setLoading(true);

    try {
      const result = await requestPasswordReset(data.email, data.cpf);

      if (result.error) {
        toast.error(result.error);
      } else {
        // Salvar dados para as próximas etapas
        setUserInfo({ email: data.email, cpf: data.cpf });
        setCurrentStep("token");
        toast.success("Um token de recuperação foi enviado para seu email");
      }
    } catch (e) {
      console.error("Erro na solicitação de reset:", e);
      toast.error("Ocorreu um erro ao solicitar redefinição de senha");
    } finally {
      setLoading(false);
    }
  };

// Manipular verificação do token
const onTokenSubmit = async (data: TokenFormData) => {
  setLoading(true);

  try {
    const result = await verifyPasswordResetToken(userInfo.email, data.token);

    if (!result.success) {
      toast.error(result.error || "Token inválido");
      setLoading(false);
      return; // Para o fluxo se o token for inválido
    }
    
    setCurrentStep("newPassword");
    toast.success("Token verificado com sucesso");
  } catch (e) {
    console.error("Erro na verificação do token:", e);
    toast.error("Ocorreu um erro ao verificar o token");
  } finally {
    setLoading(false);
  }
};

  // Manipular definição da nova senha
  const onNewPasswordSubmit = async (data: NewPasswordFormData) => {
    setLoading(true);

    try {
      const result = await resetPassword(userInfo.email, data.senha);

      if (result.error) {
        toast.error(result.error);
      } else {
        setCurrentStep("success");
        toast.success("Senha redefinida com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao redefinir senha:", e);
      toast.error("Ocorreu um erro ao redefinir a senha");
    } finally {
      setLoading(false);
    }
  };

  // Animação de transição entre os passos
  const pageTransition = {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
    transition: { duration: 0.2 },
  };

  // Voltar para o login
  const goToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Image
          width={160}
          height={48}
          src="/logo-garden.png"
          alt="Garden Química"
          className="h-16 w-auto mx-auto"
        />
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg overflow-hidden">
        {currentStep === "request" && (
          <motion.div {...pageTransition} key="request">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToLogin}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-bold">Recuperar Senha</h2>
            </div>

            <p className="mb-6 text-sm text-gray-600">
              Digite seu email e CPF para enviarmos um token de recuperação.
            </p>

            <Form {...requestForm}>
              <form
                onSubmit={requestForm.handleSubmit(onRequestSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={requestForm.control}
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
                  control={requestForm.control}
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

        {currentStep === "token" && (
          <motion.div {...pageTransition} key="token">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentStep("request")}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-bold">Verificar Token</h2>
            </div>

            <p className="mb-6 text-sm text-gray-600">
              Enviamos um token para{" "}
              <span className="font-medium">{userInfo.email}</span>. Digite-o
              abaixo para continuar.
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

        {currentStep === "newPassword" && (
          <motion.div {...pageTransition} key="new-password">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentStep("token")}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-bold">Nova Senha</h2>
            </div>

            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Usuário:</span> {userInfo.email}
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

        {currentStep === "success" && (
          <motion.div {...pageTransition} key="success">
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Senha Redefinida!</h2>
              <p className="text-gray-600 mb-6">
                Sua senha foi redefinida com sucesso. Agora você pode fazer
                login com sua nova senha.
              </p>
              <Button
                onClick={goToLogin}
                className="bg-[#00446A] hover:bg-[#00446A]/90"
              >
                Ir para Login
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}