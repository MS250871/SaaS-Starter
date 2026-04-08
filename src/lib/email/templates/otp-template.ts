export function otpTemplate({ otp, name }: { otp: string; name?: string }) {
  return {
    subject: 'Your verification code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Verify your email</h2>
        <p>Hi ${name ?? 'there'},</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  };
}
