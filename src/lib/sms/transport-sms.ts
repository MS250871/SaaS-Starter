export type SendSMSProps = {
  numbers: string[];
  message: string;
  templateId: string;
};

export async function sendSMS({ numbers, message, templateId }: SendSMSProps) {
  const res = await fetch(`${process.env.COMBIRDS_BASE_URL}/sendsms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.COMBIRDS_API_KEY!,
    },
    body: JSON.stringify({
      number: numbers,
      message,
      senderId: process.env.COMBIRDS_SENDER_ID,
      templateId,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'SMS failed');
  return data;
}
