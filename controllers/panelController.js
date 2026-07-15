const db = require('../config/db');

const getPublicPanel = async (req, res) => {
  try {
    const { panelId } = req.params;
    
    const query = 'SELECT * FROM panels WHERE id = $1';
    const result = await db.query(query, [panelId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }
    
    const panel = result.rows[0];
    
    res.status(200).json({
      id: panel.id,
      user_id: panel.user_id, // <-- Added user_id to fix the Spotlight Engine initialization
      settings: panel.settings || {}
    });
  } catch (error) {
    console.error('Error fetching public panel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPublicPanel
};
