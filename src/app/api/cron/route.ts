import { NextResponse } from 'next/server';
import { obterProgressoImportacao } from '@/actions/talkbi-actions';

export async function GET() {
  try {
    const progresso = await obterProgressoImportacao();
    return NextResponse.json(progresso);
  } catch (error) {
    return NextResponse.json({ 
      error: "Erro ao obter progresso",
      emProgresso: false,
      mensagemStatus: "Erro ao obter status da importação"
    }, { status: 500 });
  }
}