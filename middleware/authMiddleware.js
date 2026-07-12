const jwt = require('jsonwebtoken');

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      req.user = decoded;

      // Enforce specific role access if required
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: `Forbidden: ${requiredRole} access required` });
      }

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};

module.exports = {
  requireAuth: requireRole(),
  requireAdmin: requireRole('admin'),
  requireUser: requireRole('user')
};
