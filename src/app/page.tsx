export const dynamic = 'force-dynamic';
// src/app/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();
  
  if (session) {
    redirect('/painel');
  }
  
  redirect('/login');
}