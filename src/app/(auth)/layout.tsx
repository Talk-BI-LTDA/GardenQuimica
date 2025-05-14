// src/app/(auth)/layout.tsx
import { Toaster } from 'sonner'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4" 
      style={{ backgroundImage: "url('/garden-quimica-background.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />
      <div className="z-10">
        {children}
      </div>
      <Toaster position="top-right" />
    </div>
  )
}