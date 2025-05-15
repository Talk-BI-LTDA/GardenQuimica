// src/app/(dashboard)/funcionarios/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlusCircle, Edit, Trash2, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/supabase/prisma";

export default async function FuncionariosPage() {
  const session = await auth();

  // Verificamos se session existe E se o usuário é admin
  if (!session || session.user.role !== "ADMIN") {
    redirect("/painel");
  }

  // Buscar usuários
  const usuarios = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="mt-1">Cadastre e edite as informações de seus funcionários por este painel.</p>
        </div>

        <Link href="/funcionarios/novo">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border px-3 py-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Data de Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length > 0 ? (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">{usuario.name}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.cpf}</TableCell>
                  <TableCell>
                    <Badge
                      variant={usuario.role === "ADMIN" ? "azul" : "outline"}
                    >
                      {usuario.role === "ADMIN" ? "Administrador" : "Vendedor"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(usuario.createdAt), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/funcionarios/${usuario.id}/editar`}>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-32 text-gray-500"
                >
                  Nenhum funcionário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
