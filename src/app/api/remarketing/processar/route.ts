// @/app/api/remarketing/processar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processarRemarketingAgendados } from "@/actions/talkbi-actions";

export async function GET(req: NextRequest) {
  try {
    // Verificar token de autenticação (para segurança)
    const authHeader = req.headers.get("authorization");
    const token = process.env.CRON_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Processar remarketing agendados
    const resultado = await processarRemarketingAgendados();
    
    if (resultado.error) {
      return NextResponse.json(
        { error: resultado.error },
        { status: 500 }
      );
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao processar remarketing:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}