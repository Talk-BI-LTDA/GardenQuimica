export const dynamic = 'force-dynamic';

// src/app/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();
  
  // Se o usuário já estiver autenticado, redirecionar para o painel
  if (session) {
    redirect('/painel');
  }
  
  // Caso contrário, redirecionar para a página de login
  redirect('/login');
}