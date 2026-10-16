// Handles mailing-list signups; everything else is served from static assets.
import { EmailMessage } from 'cloudflare:email';

const FROM = 'mailinglist@the5to8s.ongaku.band';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return subscribe(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function subscribe(request, env) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  const form = await request.formData();
  const email = String(form.get('email') || '').trim();

  // Bots fill in the hidden "website" field; pretend it worked so they move on
  if (form.get('website')) return reply(wantsJson, 200, 'ok');

  if (email.length > 254 || !EMAIL_PATTERN.test(email) || form.get('consent') !== 'yes') {
    return reply(wantsJson, 400, 'invalid');
  }

  const date = new Date().toUTCString();
  const raw = [
    `From: The 5to8s website <${FROM}>`,
    `To: <${env.SIGNUP_MAIL_TO}>`,
    `Reply-To: <${email}>`,
    `Subject: New mailing list signup: ${email}`,
    `Date: ${date}`,
    `Message-ID: <${crypto.randomUUID()}@the5to8s.ongaku.band>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    `New signup for the 5to8s mailing list.`,
    '',
    `Email: ${email}`,
    `Signed up: ${date}`,
    `Consent: yes (shows and releases)`,
    '',
  ].join('\r\n');

  try {
    await env.SIGNUP_MAIL.send(new EmailMessage(FROM, env.SIGNUP_MAIL_TO, raw));
  } catch (error) {
    console.error('Signup email failed', error);
    return reply(wantsJson, 500, 'error');
  }
  return reply(wantsJson, 200, 'ok');
}

// The page's script asks for JSON; without JavaScript, show a minimal page
function reply(wantsJson, status, result) {
  if (wantsJson) return Response.json({ result }, { status });
  const message = result === 'ok'
    ? 'Thanks! You’re on the list.'
    : 'Something went wrong. Please go back and try again.';
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>The 5to8s</title><link rel="stylesheet" href="/styles.css"><main class="not-found"><p class="body">${message}</p><a class="ticket-link" href="/">Back to the site</a></main>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
