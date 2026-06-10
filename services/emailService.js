const https = require('https');
const templates = require('../emailTemplates');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const sendEmail = async (to, subject, html, from) => {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email send to', to);
    return false;
  }

  return new Promise((resolve) => {
    const data = JSON.stringify({
      from: from,
      to: [to],
      subject: subject,
      html: html
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          console.error('Failed to send email:', res.statusCode, body);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error sending email via Resend:', error);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
};

const sendWelcomeEmail = async (email, name) => {
  return sendEmail(
    email,
    'Welcome to Passively!',
    templates.welcomeEmail(name || 'there'),
    'Passively <welcome@send.gopassively.com>'
  );
};

const sendVerificationEmail = async (email, name, token) => {
  return sendEmail(
    email,
    'Verify your Passively account',
    templates.verifyEmail(name || 'there', token),
    'Passively <accounts@send.gopassively.com>'
  );
};

const sendPasswordResetEmail = async (email, name, token) => {
  return sendEmail(
    email,
    'Reset your Passively password',
    templates.passwordResetEmail(name || 'there', token),
    'Passively Security <security@send.gopassively.com>'
  );
};

const sendAccountActivatedEmail = async (email, name) => {
  return sendEmail(
    email,
    'Your Passively account is active!',
    templates.accountActivatedEmail(name || 'there'),
    'Passively <welcome@send.gopassively.com>'
  );
};

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountActivatedEmail
};
