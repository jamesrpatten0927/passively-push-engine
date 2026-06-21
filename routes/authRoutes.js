const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Simple in-memory rate limiter
function createRateLimiter(windowMs, max) {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const timestamps = requests.get(ip).filter(
      time => now - time < windowMs
    );

    timestamps.push(now);
    requests.set(ip, timestamps);

    if (timestamps.length > max) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.'
      });
    }

    next();
  };
}

const authLimiter = createRateLimiter(15 * 60 * 1000, 20);

router.post('/login', authLimiter, authController.login);
router.post('/signup', authLimiter, authController.signup);
router.post('/verify-email', authController.verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  authController.resendVerification
);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post(
  '/change-email',
  authLimiter,
  authController.changeEmail
);

router.post(
  '/verify-email-change',
  authController.verifyEmailChange
);

router.post(
  '/change-password',
  authLimiter,
  authController.changePassword
);

router.get(
  '/users/:userId',
  authController.getUserProfile
);

router.put(
  '/users/:userId/profile',
  authController.updateUserProfile
);

module.exports = router;
