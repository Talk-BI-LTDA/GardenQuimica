// src/components/auth-sidebar.tsx
import { auth } from '@/lib/auth';
import { Sidebar } from './dashboard/sidebar';

export async function AuthSidebar() {
  const session = await auth();
  const usuario = session?.user || {
    id: '',
    name: 'Usuário',
    email: 'email@example.com',
    role: 'VENDEDOR'
  };

  return <Sidebar usuario={usuario} />;
}