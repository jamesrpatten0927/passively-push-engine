require('dotenv').config();

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  const token = authHeader.split(' ')[1];

  if (token === process.env.MASTER_ADMIN_PASSWORD) {
    req.user = {
      role: 'master_admin',
      location_id: 'master'
    };

    return next();
  }

  if (token === process.env.TENANT_PASSWORD) {

    const locationId = req.headers['x-location-id'];

    if (!locationId) {
      return res.status(400).json({
        error: 'Missing x-location-id header'
      });
    }

    req.user = {
      role: 'landlord',
      location_id: locationId
    };

    return next();
  }

  return res.status(403).json({
    error: 'Forbidden'
  });
};

module.exports = {
  authenticateUser
};
