// app/api/test-talkbi-connection/route.ts
import { NextResponse } from 'next/server';
import { testeTalkBIConnection } from '@/actions/talkbi-actions';

export async function GET() {
  try {
    const resultado = await testeTalkBIConnection();
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return NextResponse.json({ error: 'Erro interno ao testar conexão' }, { status: 500 });
  }
}