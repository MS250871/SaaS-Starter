import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendMailProps = {
  to: string;
  subject: string;
  html: string;
};

export async function sendMail({ to, subject, html }: SendMailProps) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Email send failed:', error);
    throw new Error('Mail delivery failed');
  }
}
