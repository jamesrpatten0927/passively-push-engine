const db = require('../config/db');

const getPlatformMetrics = async (req, res) => {
  try {
    const usersResult = await db.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count, 10);

    res.status(200).json({
      totalAccounts: totalUsers,
      totalUsers: totalUsers,
      accounts: { total: totalUsers, active: totalUsers, suspended: 0, trial: 0, cancelled: 0 },
      users: { total: totalUsers, newToday: 0, newThisMonth: 0 },
      subscribers: { total: 0, byAccount: {} },
      campaigns: { total: 0, active: 0, inactive: 0 },
      panels: { total: 0, withQuestionnaires: 0, withTabs: 0 },
      notifications: { sentToday: 0, sentThisMonth: 0 }
    });
  } catch (error) {
    console.error('Get platform metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    // Only return actual users from the users table.
    const query = `
      SELECT 
        id as user_id, 
        first_name, 
        last_name, 
        email, 
        role 
      FROM users
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.status(200).json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPlatformMetrics,
  getUsers
};
