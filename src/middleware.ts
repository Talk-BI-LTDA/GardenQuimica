// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas e estáticas
const publicRoutes = ['/login', '/cadastro', '/esqueci-senha', '/resetar-senha'];
const staticPatterns = ['/api/', '/_next/', '/static/', '/public/', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Ignorar arquivos estáticos para melhor performance
  if (staticPatterns.some(pattern => path.startsWith(pattern))) {
    return NextResponse.next();
  }
  
  // Verificação de autenticação
  const sessionCookie = request.cookies.get('session');
  const isAuthenticated = sessionCookie?.value ? true : false;
  
  // Verificar se é rota pública
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  
  // Redirecionamentos baseados em autenticação
  if (!isAuthenticated && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (isAuthenticated && isPublicRoute) {
    const redirectUrl = new URL('/painel', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return NextResponse.next();
}

// Configuração mais eficiente
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};