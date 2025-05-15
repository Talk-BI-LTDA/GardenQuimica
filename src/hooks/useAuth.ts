// src/hooks/useAuth.ts
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function verifyAuth(requireAdmin = false) {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  if (requireAdmin && session.user.role !== 'ADMIN') {
    redirect('/dashboard/painel');
  }
  
  return session;
}