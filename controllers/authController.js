const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const storedPassword = user.password_hash;

    if (!storedPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, storedPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.is_verified === false) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified'
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user_id: user.user_id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    console.log('SIGNUP BODY:', req.body);

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const checkQuery = 'SELECT id FROM users WHERE email = $1';
    const checkResult = await db.query(checkQuery, [email.toLowerCase()]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const userId =
  'user_' +
  uuidv4().replace(/-/g, '').substring(0, 12);

const insertQuery = `
  INSERT INTO users (
    user_id,
    first_name,
    last_name,
    email,
    password_hash,
    verification_token
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING id, user_id, email;
`;

const result = await db.query(insertQuery, [
  userId,
  firstName,
  lastName,
  email.toLowerCase(),
  hashedPassword,
  verificationToken
]);

    const newUser = result.rows[0];

    emailService
      .sendVerificationEmail(email, firstName, verificationToken)
      .catch(err => {
        console.error(
          'Verification email failed (non-fatal):',
          err
        );
      });

    res.status(201).json({
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
      user_id: newUser.user_id
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const query = `
      UPDATE users
      SET is_verified = TRUE,
          verification_token = NULL
      WHERE verification_token = $1
      RETURNING id, email, first_name
    `;

    const result = await db.query(query, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    const user = result.rows[0];

    emailService
      .sendAccountActivatedEmail(
        user.email,
        user.first_name
      )
      .catch(err => {
        console.error(
          'Account activated email failed (non-fatal):',
          err
        );
      });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(
      Date.now() + 3600000
    );

    const query = `
      UPDATE users
      SET reset_token = $1,
          reset_token_expires = $2
      WHERE email = $3
      RETURNING id, first_name
    `;

    const result = await db.query(query, [
      resetToken,
      resetTokenExpires,
      email.toLowerCase()
    ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      emailService
        .sendPasswordResetEmail(
          email,
          user.first_name,
          resetToken
        )
        .catch(err => {
          console.error(
            'Password reset email failed (non-fatal):',
            err
          );
        });
    }

    res.status(200).json({
      success: true,
      message:
        'If an account exists, a reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Token and password are required'
      });
    }

    const userQuery = `
      SELECT id
      FROM users
      WHERE reset_token = $1
      AND reset_token_expires > NOW()
    `;

    const userResult = await db.query(userQuery, [token]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const updateQuery = `
      UPDATE users
      SET password_hash = $1,
          reset_token = NULL,
          reset_token_expires = NULL
      WHERE id = $2
    `;

    await db.query(updateQuery, [
      hashedPassword,
      userResult.rows[0].id
    ]);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changeEmail = async (req, res) => {
  try {
    const { userId, currentPassword, newEmail } = req.body;

    if (!userId || !currentPassword || !newEmail) {
      return res.status(400).json({
        error: 'User ID, password, and new email are required'
      });
    }

    const userResult = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        error: 'Incorrect password'
      });
    }

    const emailExists = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [newEmail.toLowerCase()]
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already in use'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const expires = new Date(
      Date.now() + 60 * 60 * 1000
    );

    await db.query(
      `
      UPDATE users
      SET pending_email = $1,
          email_change_token = $2,
          email_change_expires = $3
      WHERE user_id = $4
      `,
      [
        newEmail.toLowerCase(),
        token,
        expires,
        userId
      ]
    );

    await emailService.sendEmailChangeEmail(
      newEmail.toLowerCase(),
      user.first_name,
      token
    );

    res.json({
      success: true,
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.body;

    const result = await db.query(
      `
      SELECT id, pending_email
      FROM users
      WHERE email_change_token = $1
      AND email_change_expires > NOW()
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired token'
      });
    }

    const user = result.rows[0];

    await db.query(
      `
      UPDATE users
      SET email = $1,
          pending_email = NULL,
          email_change_token = NULL,
          email_change_expires = NULL
      WHERE id = $2
      `,
      [user.pending_email, user.id]
    );

    res.json({
      success: true,
      message: 'Email updated successfully'
    });

  } catch (error) {
    console.error('Verify email change error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const {
      userId,
      currentPassword,
      newPassword
    } = req.body;

    if (
      !userId ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        error:
          'User ID, current password and new password are required'
      });
    }

    const userResult = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        salt
      );

    await db.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE user_id = $2
      `,
      [
        hashedPassword,
        userId
      ]
    );

    res.json({
      success: true,
      message:
        'Password updated successfully'
    });

  } catch (error) {
    console.error(
      'Change password error:',
      error
    );

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const userResult = await db.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message:
          'If an account exists, a verification email has been sent.'
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        error: 'Account is already verified'
      });
    }

    const verificationToken =
      crypto.randomBytes(32).toString('hex');

    await db.query(
      `
      UPDATE users
      SET verification_token = $1
      WHERE id = $2
      `,
      [
        verificationToken,
        user.id
      ]
    );

    await emailService.sendVerificationEmail(
      user.email,
      user.first_name,
      verificationToken
    );

    res.json({
      success: true,
      message:
        'Verification email sent successfully'
    });

  } catch (error) {
    console.error(
      'Resend verification error:',
      error
    );

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `
      SELECT
        user_id,
        first_name,
        last_name,
        email
      FROM users
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  login,
  signup,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changeEmail,
  verifyEmailChange,
  changePassword,
  getUserProfile
};
