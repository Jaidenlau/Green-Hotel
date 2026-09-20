/**
 * Email goes out through Resend, which needs nothing but an API key and a
 * verified sender domain. If it isn't configured we return `false` and the
 * caller tells the guest to email the owner directly — better than pretending
 * a message was delivered.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from || !mail.to) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("[email] Resend responded", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email]", error);
    return false;
  }
}
