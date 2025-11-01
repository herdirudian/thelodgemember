import nodemailer from 'nodemailer';

type SMTPConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
};

function getSMTPConfig(): SMTPConfig {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = process.env.SMTP_USER || undefined;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || undefined;
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@localhost';
  const fromName = process.env.FROM_NAME || 'The Lodge Family';
  return { host, port, secure, user, pass, fromEmail, fromName };
}

export async function sendEmail(to: string, subject: string, html: string, text?: string, attachments?: any[]): Promise<void> {
  const cfg = getSMTPConfig();
  const auth = cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined;
  const transporter = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth });

  const from = `${cfg.fromName} <${cfg.fromEmail}>`;
  const mail = { from, to, subject, text: text || html.replace(/<[^>]+>/g, ''), html, attachments };

  try {
    await transporter.sendMail(mail);
  } catch (e) {
    // In dev environments without SMTP, log and continue to avoid breaking flow
    console.warn('sendEmail failed; falling back to console log:', (e as any)?.message || e);
    console.info(`[DEV EMAIL] To: ${to}`);
    console.info(`[DEV EMAIL] Subject: ${subject}`);
    console.info(`[DEV EMAIL] Body: ${text || html}`);
  }
}