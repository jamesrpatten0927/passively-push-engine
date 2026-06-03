const pool = require('../config/db');

exports.getPublicCampaigns = async (req, res) => {
  try {
    const { panelId } = req.params;

    // Fetch all campaigns for this advisor
    const campaignsResult = await pool.query(
      'SELECT * FROM spotlight_campaigns WHERE panel_id = $1',
      [panelId]
    );

    // Fetch only active schedules for this advisor
    const schedulesResult = await pool.query(
      'SELECT * FROM universal_schedules WHERE panel_id = $1 AND status = $2',
      [panelId, 'active']
    );

    // Map DB snake_case to frontend camelCase
    const campaigns = campaignsResult.rows.map(row => ({
      id: row.id,
      panelId: row.panel_id,
      name: row.name,
      title: row.title,
      description: row.description,
      badgeText: row.badge_text,
      buttonText: row.button_text,
      imageUrl: row.image_url,
      targetAction: row.target_action,
      targetId: row.target_id,
      inheritColor: row.inherit_color,
      customColor: row.custom_color,
      scheduleId: row.schedule_id
    }));

    const schedules = schedulesResult.rows.map(row => ({
      id: row.id,
      panelId: row.panel_id,
      name: row.name,
      targetType: row.target_type,
      targetId: row.target_id,
      startDate: row.start_date,
      endDate: row.end_date,
      timezone: row.timezone,
      recurrence: row.recurrence,
      status: row.status
    }));

    res.status(200).json({ campaigns, schedules });
  } catch (error) {
    console.error('Error fetching public campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch public campaigns' });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { panelId } = req.params;
    const result = await pool.query('SELECT * FROM spotlight_campaigns WHERE panel_id = $1', [panelId]);
    
    // Map to camelCase...
    const campaigns = result.rows.map(row => ({
      id: row.id,
     panelId: row.panel_id,
      name: row.name,
      title: row.title,
      description: row.description,
      badgeText: row.badge_text,
      buttonText: row.button_text,
      imageUrl: row.image_url,
      targetAction: row.target_action,
      targetId: row.target_id,
      inheritColor: row.inherit_color,
      customColor: row.custom_color,
      scheduleId: row.schedule_id
    }));
    
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveCampaign = async (req, res) => {
  try {
    const {
      id, panelId, name, title, description, badgeText, buttonText,
      imageUrl, targetAction, targetId, inheritColor, customColor, scheduleId
    } = req.body;

    await pool.query(
      `INSERT INTO spotlight_campaigns 
       (id, panel_id, name, title, description, badge_text, button_text, image_url, target_action, target_id, inherit_color, custom_color, schedule_id, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
       name = EXCLUDED.name, title = EXCLUDED.title, description = EXCLUDED.description, 
       badge_text = EXCLUDED.badge_text, button_text = EXCLUDED.button_text, image_url = EXCLUDED.image_url, 
       target_action = EXCLUDED.target_action, target_id = EXCLUDED.target_id, 
       inherit_color = EXCLUDED.inherit_color, custom_color = EXCLUDED.custom_color, 
       schedule_id = EXCLUDED.schedule_id, updated_at = CURRENT_TIMESTAMP`,
      [id, panelId, name, title, description, badgeText, buttonText, imageUrl, targetAction, targetId, inheritColor, customColor, scheduleId]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    await pool.query('DELETE FROM spotlight_campaigns WHERE id = $1', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Schedule Methods ---
exports.getSchedules = async (req, res) => {
  try {
    const { panelId } = req.params;
    const result = await pool.query('SELECT * FROM universal_schedules WHERE panel_id = $1', [panelId]);
    
    const schedules = result.rows.map(row => ({
      id: row.id,
      panelId: row.panel_id,
      name: row.name,
      targetType: row.target_type,
      targetId: row.target_id,
      startDate: row.start_date,
      endDate: row.end_date,
      timezone: row.timezone,
      recurrence: row.recurrence,
      status: row.status
    }));
    
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveSchedule = async (req, res) => {
  try {
    const {
      id, panelId, name, targetType, targetId, startDate, endDate, timezone, recurrence, status
    } = req.body;

    await pool.query(
      `INSERT INTO universal_schedules 
       (id, panel_id, name, target_type, target_id, start_date, end_date, timezone, recurrence, status, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET 
       name = EXCLUDED.name, target_type = EXCLUDED.target_type, target_id = EXCLUDED.target_id, 
       start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, timezone = EXCLUDED.timezone, 
       recurrence = EXCLUDED.recurrence, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [id, panelId, name, targetType, targetId, startDate, endDate, timezone, recurrence, status]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    await pool.query('DELETE FROM universal_schedules WHERE id = $1', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
