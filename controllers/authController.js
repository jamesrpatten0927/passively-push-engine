const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Email utility for sending transactional emails
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

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check verification
    if (!user.is_verified) {
      return res.status(403).json({ success: false, error: 'Email not verified' });
    }

    // Create token
    const token = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user_id: user.id,
      role: user.role
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const checkQuery = 'SELECT id FROM users WHERE email = $1';
    const checkResult = await db.query(checkQuery, [email.toLowerCase()]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const insertQuery = `
      INSERT INTO users (first_name, last_name, email, password, verification_token, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, role;
    `;

    const result = await db.query(insertQuery, [
      firstName,
      lastName,
      email.toLowerCase(),
      hashedPassword,
      verificationToken,
      'USER'
    ]);

    const newUser = result.rows[0];

    // Send verification email
    await emailService.sendVerificationEmail(email, firstName, verificationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user_id: newUser.id
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

    const query = 'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id, email, first_name';
    const result = await db.query(query, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    // Send account activated email
    const user = result.rows[0];
    await emailService.sendAccountActivatedEmail(user.email, user.first_name);

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const query = 'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING id, first_name';
    const result = await db.query(query, [resetToken, resetTokenExpires, email.toLowerCase()]);

    if (result.rows.length > 0) {
      // Send reset email
      const user = result.rows[0];
      await emailService.sendPasswordResetEmail(email, user.first_name, resetToken);
    }

    // Always return success to prevent email enumeration
    res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Find user with token and check expiry
    const userQuery = 'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()';
    const userResult = await db.query(userQuery, [token]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user
    const updateQuery = 'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2';
    await db.query(updateQuery, [hashedPassword, userResult.rows[0].id]);

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  login,
  signup,
  verifyEmail,
  forgotPassword,
  resetPassword
};
