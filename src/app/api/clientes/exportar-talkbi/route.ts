// API route para processar requisições de exportação
// app/api/clientes/exportar-talkbi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { exportarClientesTalkBI, atualizarPrefixoWhatsAppClientes } from "@/actions/talkbi-actions";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { acao, filtros } = body;
    
    if (acao === "exportar") {
      const resultado = await exportarClientesTalkBI(filtros);
      return NextResponse.json(resultado);
    } else if (acao === "atualizar-prefixo") {
      const resultado = await atualizarPrefixoWhatsAppClientes();
      return NextResponse.json(resultado);
    } else {
      return NextResponse.json(
        { error: "Ação não reconhecida" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Erro na API de exportação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}