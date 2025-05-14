// src/lib/cookie-utils.ts
import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Define um cookie com segurança
 */
export async function setCookie(options: ResponseCookie): Promise<void> {
    (await cookies()).set(options);
  }

/**
 * Remove um cookie com segurança
 */
export async function deleteCookie(name: string): Promise<void> {
    (await cookies()).delete(name);
  }

/**
 * Obtém um cookie com segurança
 */
export async function getCookie(name: string): Promise<string | undefined> {
    const cookie = (await cookies()).get(name);
    return cookie?.value;
  }