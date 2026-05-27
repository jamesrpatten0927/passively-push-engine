const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Initialize pool directly using existing Render environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

// Safe, idempotent database migration on startup
const migrateDatabase = async () => {
  try {
    // Ensure base panels table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS panels (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        text TEXT,
        button_text VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure analytics table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS panel_events (
        id SERIAL PRIMARY KEY,
        panel_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        tab_id VARCHAR(255),
        tab_label VARCHAR(255),
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check existing panel columns
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='panels';
    `);

    const existingColumns = res.rows.map(r => r.column_name);

    const columnsToAdd = [];

    if (!existingColumns.includes('status')) {
      columnsToAdd.push(`ADD COLUMN status VARCHAR(20) DEFAULT 'draft'`);
    }

    if (!existingColumns.includes('settings')) {
      columnsToAdd.push(`ADD COLUMN settings JSONB DEFAULT '{}'::jsonb`);
    }

    if (!existingColumns.includes('blocks')) {
      columnsToAdd.push(`ADD COLUMN blocks JSONB DEFAULT '[]'::jsonb`);
    }

    if (!existingColumns.includes('metadata')) {
      columnsToAdd.push(`ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb`);
    }

    // Add missing columns safely
    if (columnsToAdd.length > 0) {
      console.log(`Migration: Adding columns to panels table`);
      await pool.query(`
        ALTER TABLE panels
        ${columnsToAdd.join(', ')};
      `);

      console.log('Migration completed successfully.');
    } else {
      console.log('Migration: All columns already exist.');
    }

    console.log('PostgreSQL tables verified.');

  } catch (err) {
    console.error('Migration error:', err);
  }
};

// Run migration on startup
migrateDatabase();


// ==========================================
// ANALYTICS EVENT INGESTION
// ==========================================

router.post('/analytics', async (req, res) => {
  const {
    panelId,
    eventType,
    tabId,
    tabLabel,
    sessionId,
    timestamp
  } = req.body;

  if (!panelId || !eventType) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  try {
    await pool.query(
      `
      INSERT INTO panel_events (
        panel_id,
        event_type,
        tab_id,
        tab_label,
        session_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        panelId,
        eventType,
        tabId || null,
        tabLabel || null,
        sessionId || null,
        timestamp || new Date()
      ]
    );

    res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('Error saving analytics event:', error);

    res.status(500).json({
      error: 'Failed to save event'
    });
  }
});


// ==========================================
// GET PANEL ANALYTICS
// IMPORTANT:
// MUST COME BEFORE '/:id'
// ==========================================

router.get('/:id/analytics', async (req, res) => {
  const { id } = req.params;

  try {
    const opensResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM panel_events
      WHERE panel_id = $1
      AND event_type = 'panel_opened'
      `,
      [id]
    );

    const clicksResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM panel_events
      WHERE panel_id = $1
      AND event_type = 'tab_clicked'
      `,
      [id]
    );

    const mostClickedResult = await pool.query(
      `
      SELECT tab_label, COUNT(*) as count
      FROM panel_events
      WHERE panel_id = $1
      AND event_type = 'tab_clicked'
      AND tab_label IS NOT NULL
      GROUP BY tab_label
      ORDER BY count DESC
      LIMIT 1
      `,
      [id]
    );

    res.status(200).json({
      panelId: id,
      totalOpens: parseInt(opensResult.rows[0]?.count || '0', 10),
      totalTabClicks: parseInt(clicksResult.rows[0]?.count || '0', 10),
      mostClickedTab: mostClickedResult.rows[0]?.tab_label || null
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);

    res.status(500).json({
      error: 'Failed to fetch analytics'
    });
  }
});


// ==========================================
// SAVE / UPDATE PANEL
// ==========================================

router.post('/', async (req, res) => {
  const {
    id,
    title,
    text,
    buttonText,
    status,
    settings,
    blocks,
    metadata
  } = req.body;

  if (!id) {
    return res.status(400).json({
      error: 'Panel ID is required'
    });
  }

  const panelStatus = status || 'draft';
  const panelSettings = settings || {};
  const panelBlocks = blocks || [];
  const panelMetadata = metadata || {};

  try {
    const query = `
      INSERT INTO panels (
        id,
        title,
        text,
        button_text,
        status,
        settings,
        blocks,
        metadata,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        CURRENT_TIMESTAMP
      )

      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        text = EXCLUDED.text,
        button_text = EXCLUDED.button_text,
        status = EXCLUDED.status,
        settings = EXCLUDED.settings,
        blocks = EXCLUDED.blocks,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP

      RETURNING *;
    `;

    const values = [
      id,
      title,
      text,
      buttonText,
      panelStatus,
      JSON.stringify(panelSettings),
      JSON.stringify(panelBlocks),
      JSON.stringify(panelMetadata)
    ];

    const result = await pool.query(query, values);

    const savedPanel = result.rows[0];

    res.status(200).json({
      id: savedPanel.id,
      title: savedPanel.title,
      text: savedPanel.text,
      buttonText: savedPanel.button_text,
      status: savedPanel.status,
      settings: savedPanel.settings,
      blocks: savedPanel.blocks,
      metadata: savedPanel.metadata,
      updatedAt: savedPanel.updated_at
    });

  } catch (err) {
    console.error('Error saving panel:', err);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});


// ==========================================
// GET ALL PANELS
// ==========================================

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM panels
      ORDER BY updated_at DESC
    `);

    const panels = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      text: row.text,
      buttonText: row.button_text,
      status: row.status || 'live',
      settings: row.settings || {},
      blocks: row.blocks || [],
      metadata: row.metadata || {},
      updatedAt: row.updated_at
    }));

    res.status(200).json(panels);

  } catch (err) {
    console.error('Error fetching panels:', err);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});


// ==========================================
// GET SINGLE PANEL
// ==========================================

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM panels
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Panel not found'
      });
    }

    const row = result.rows[0];

    res.status(200).json({
      id: row.id,
      title: row.title,
      text: row.text,
      buttonText: row.button_text,
      status: row.status || 'live',
      settings: row.settings || {},
      blocks: row.blocks || [],
      metadata: row.metadata || {},
      updatedAt: row.updated_at
    });

  } catch (err) {
    console.error('Error fetching panel:', err);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});


// ==========================================
// DELETE PANEL
// ==========================================

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM panels
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Panel not found'
      });
    }

    res.status(200).json({
      message: 'Panel deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting panel:', err);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
