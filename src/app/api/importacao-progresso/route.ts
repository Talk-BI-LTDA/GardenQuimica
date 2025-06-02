import { NextResponse } from 'next/server';
import { obterProgressoImportacao } from '@/actions/talkbi-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const progresso = await obterProgressoImportacao();
    
    return NextResponse.json(progresso, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Erro ao obter progresso",
      emProgresso: false,
      mensagem: "Erro ao obter status da importação",
      processados: 0,
      total: 0,
      importados: 0,
      atualizados: 0,
      falhas: 0,
      porcentagem: 0,
      timestamp: Date.now()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}