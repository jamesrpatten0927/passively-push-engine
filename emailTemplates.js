const getBaseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passively</title>
    <style>
        body {
            background-color: #0a0a0a;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            height: 40px;
            width: auto;
        }
        .content {
            background-color: #1a1a1a;
            border: 1px solid #333333;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
        }
        h1 {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
        }
        p {
            color: #a0a0a0;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .button {
            background-color: #fe0191;
            color: #ffffff !important;
            display: inline-block;
            font-size: 16px;
            font-weight: 600;
            padding: 14px 30px;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(254, 1, 145, 0.3);
            transition: all 0.3s ease;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #666666;
            font-size: 12px;
        }
        .footer a {
            color: #666666;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://assets.cdn.filesafe.space/BJNAXcykxyo1sTnt9ZaB/media/6a26362cfc95b24549b771b4.png" alt="Passively" class="logo">
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Passively. All rights reserved.<br>
            <a href="https://dashboard.passivelyplus.com/privacy">Privacy Policy</a> | <a href="https://dashboard.passivelyplus.com/terms">Terms of Service</a>
        </div>
    </div>
</body>
</html>
`;

const welcomeEmail = (name) => getBaseTemplate(`
    <h1>Welcome to Passively, ${name}!</h1>
    <p>We're thrilled to have you on board. Passively helps you build an audience while you sleep, automating your growth so you can focus on what matters.</p>
    <p>Get started by exploring your dashboard and setting up your first advisor panel.</p>
    <a href="https://dashboard.passivelyplus.com/dashboard" class="button">Go to Dashboard</a>
`);

const verifyEmail = (name, token) => getBaseTemplate(`
    <h1>Verify your email</h1>
    <p>Hi ${name}, thanks for signing up! Please verify your email address to activate your account and start building your audience.</p>
    <a href="https://dashboard.passivelyplus.com/verify-email?token=${token}" class="button">Verify Email</a>
    <p style="margin-top: 30px; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
    https://dashboard.passivelyplus.com/verify-email?token=${token}</p>
`);

const passwordResetEmail = (name, token) => getBaseTemplate(`
    <h1>Reset your password</h1>
    <p>Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.</p>
    <a href="https://dashboard.passivelyplus.com/reset-password?token=${token}" class="button">Reset Password</a>
    <p style="margin-top: 30px; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
`);

const accountActivatedEmail = (name) => getBaseTemplate(`
    <h1>Account Activated</h1>
    <p>Hi ${name}, your email has been successfully verified. Your Passively account is now fully active.</p>
    <p>You can now log in and start using all the features to grow your audience.</p>
    <a href="https://dashboard.passivelyplus.com/login" class="button">Sign In Now</a>
`);

const emailChangeEmail = (name, token) => getBaseTemplate(`
    <h1>Confirm Email Change</h1>
    <p>Hi ${name}, please confirm your new email address.</p>

    <a href="https://dashboard.passivelyplus.com/verify-email-change?token=${token}" class="button">
        Confirm Email Change
    </a>
`);

module.exports = {
    welcomeEmail,
    verifyEmail,
    passwordResetEmail,
    accountActivatedEmail,
    emailChangeEmail
};
