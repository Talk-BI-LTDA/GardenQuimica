// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// **OTIMIZAÇÃO**: Usar Sets para lookup mais rápido
const publicRoutes = new Set(['/login', '/cadastro', '/esqueci-senha', '/resetar-senha']);
const staticPrefixes = ['/_next/', '/static/', '/api/', '/favicon', '/robots', '/sitemap'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // **PERFORMANCE**: Early return para arquivos estáticos
  if (staticPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  
  // **OTIMIZAÇÃO**: Cache do cookie de sessão
  const sessionCookie = request.cookies.get('session');
  const isAuthenticated = Boolean(sessionCookie?.value);
  
  // **PERFORMANCE**: Verificação otimizada de rota pública
  const isPublicRoute = publicRoutes.has(pathname) || pathname === '/';
  
  // **LÓGICA SIMPLIFICADA**: Redirecionamentos
  if (!isAuthenticated && !isPublicRoute) {
    // Usuário não autenticado tentando acessar rota protegida
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isAuthenticated && (pathname === '/login' || pathname === '/')) {
    // Usuário autenticado na página de login ou home
    return NextResponse.redirect(new URL('/painel', request.url));
  }
  
  return NextResponse.next();
}

// **CONFIGURAÇÃO OTIMIZADA**: Matcher mais eficiente
export const config = {
  matcher: [
    // Excluir explicitamente arquivos estáticos para melhor performance
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};