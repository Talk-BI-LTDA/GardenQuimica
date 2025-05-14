// src/lib/email-service.ts
import nodemailer from 'nodemailer';

type EmailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<boolean> {
  try {
    // Criar transportador SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT === '465', // true para porta 465, false para outras
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Enviar email
    const info = await transporter.sendMail({
      from: `"Garden Química" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email enviado: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}