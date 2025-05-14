/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // ✅ Corrigido: fora de "experimental"
  serverExternalPackages: ['@prisma/client'],

  // Pode deixar o "experimental" vazio ou remover se não houver mais nada
  experimental: {},

  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
