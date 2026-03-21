export function otpSms({ brand, otp }: { brand?: string; otp: string }) {
  return `Your ${brand ? brand + ' ' : ' '}OTP for verification is: ${otp}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies`;
}
