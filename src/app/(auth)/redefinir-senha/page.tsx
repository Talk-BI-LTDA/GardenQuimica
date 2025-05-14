// src/app/(auth)/resetar-senha/page.tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Image from 'next/image'

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <Image 
        src="/logo-garden.png" 
        alt="Garden Química" 
        width={160}
        height={48}
        className="mb-8"
      />
      <ResetPasswordForm />
    </div>
  )
}