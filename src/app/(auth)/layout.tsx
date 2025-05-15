/* eslint-disable @next/next/no-img-element */
// src/app/(auth)/layout.tsx
import { Toaster } from 'sonner'
import background from '../../app/assets/garden-quimica-background.jpg';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* img escondida só pra forçar carregamento */}
      <img src={background.src} alt="logo" style={{ width: '100%', height: '100vh', objectFit: 'cover', position:'absolute' }} />

      <div
        className="absolute inset-0 bg-[#00141f]/45 backdrop-blur-sm z-0"
        style={{ backgroundImage: "url('/garden-quimica-background.jpg')" }}
      />
      <div className="z-10">{children}</div>
      <Toaster position="top-right" />
    </div>
  )
}