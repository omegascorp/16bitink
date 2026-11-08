import nodemailer, { type Transporter } from 'nodemailer';
import type { Mail } from './emailSignIn';
import { optionalEnv, requireEnv } from './env';

/**
 * Sends email through Amazon SES's SMTP interface: SMTP_HOST, SMTP_PORT,
 * SMTP_USER and SMTP_PASS (SES SMTP credentials, not AWS access keys), and
 * SMTP_FROM, an address on a domain verified in SES.
 */
const DEFAULT_FROM = '16bit.ink <signin@16bit.ink>';
/** SES answers in well under a second; past this the player is better off trying again. */
const TIMEOUT_MS = 15_000;

let transporter: Transporter | null = null;

function transport(): Transporter {
  if (transporter) return transporter;
  const port = Number(requireEnv('SMTP_PORT'));
  if (!Number.isInteger(port) || port <= 0) throw new Error('SMTP_PORT must be a port number');
  transporter = nodemailer.createTransport({
    host: requireEnv('SMTP_HOST'),
    port,
    // 465 speaks TLS from the start; 587 and 25 upgrade with STARTTLS, which we insist on.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: requireEnv('SMTP_USER'), pass: requireEnv('SMTP_PASS') },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  return transporter;
}

/** Sends `mail` to one address; throws when the server refuses it or can't be reached. */
export async function sendMail(to: string, mail: Mail): Promise<void> {
  await transport().sendMail({ from: optionalEnv('SMTP_FROM') ?? DEFAULT_FROM, to, subject: mail.subject, text: mail.text, html: mail.html });
}
