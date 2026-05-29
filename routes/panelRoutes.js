const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// ==========================================
// DATABASE
// ==========================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
});

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

function authenticateToken(req, res, next) {

  const authHeader = req.headers["authorization"];

  const token =
    authHeader &&
    authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Missing token"
    });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (err, user) => {

      if (err) {
        return res.status(403).json({
          error: "Invalid token"
        });
      }

      req.user = user;

      next();

    }
  );

}

// ==========================================
// DATABASE MIGRATION
// ==========================================

const migrateDatabase = async () => {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS panels (
        id VARCHAR(255) PRIMARY KEY,
        user_id TEXT,
        title VARCHAR(255),
        text TEXT,
        button_text VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='panels';
    `);

    const existingColumns =
      res.rows.map(r => r.column_name);

    const columnsToAdd = [];

    if (!existingColumns.includes('user_id')) {
      columnsToAdd.push(`ADD COLUMN user_id TEXT`);
    }

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

    if (columnsToAdd.length > 0) {

      await pool.query(`
        ALTER TABLE panels
        ${columnsToAdd.join(', ')};
      `);

      console.log("Panel migration completed");

    }

    console.log("Panels database verified");

  } catch (err) {

    console.error("Migration error:", err);

  }

};

migrateDatabase();

// ==========================================
// ANALYTICS
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

    console.error(error);

    res.status(500).json({
      error: 'Failed to save event'
    });

  }

});

// ==========================================
// PANEL ANALYTICS
// ==========================================

router.get(
  '/:id/analytics',
  authenticateToken,
  async (req, res) => {

    const { id } = req.params;

    try {

      const panelCheck = await pool.query(
        `
        SELECT *
        FROM panels
        WHERE id = $1
        AND user_id = $2
        `,
        [
          id,
          req.user.user_id
        ]
      );

      if (panelCheck.rows.length === 0) {

        return res.status(404).json({
          error: 'Panel not found'
        });

      }

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

      res.status(200).json({
        panelId: id,
        totalOpens: parseInt(opensResult.rows[0]?.count || '0'),
        totalTabClicks: parseInt(clicksResult.rows[0]?.count || '0')
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: 'Failed to fetch analytics'
      });

    }

  }
);

// ==========================================
// SAVE PANEL
// ==========================================

router.post(
  '/',
  authenticateToken,
  async (req, res) => {

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

    try {

      const query = `
        INSERT INTO panels (
          id,
          user_id,
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
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
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
        req.user.user_id,
        title,
        text,
        buttonText,
        status || 'draft',
        JSON.stringify(settings || {}),
        JSON.stringify(blocks || []),
        JSON.stringify(metadata || {})
      ];

      const result =
        await pool.query(query, values);

      res.status(200).json(result.rows[0]);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Internal server error'
      });

    }

  }
);

// ==========================================
// GET ALL USER PANELS
// ==========================================

router.get(
  '/',
  authenticateToken,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT *
        FROM panels
        WHERE user_id = $1
        ORDER BY updated_at DESC
        `,
        [req.user.user_id]
      );

      res.status(200).json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Internal server error'
      });

    }

  }
);

// ==========================================
// GET SINGLE PANEL
// ==========================================

router.get(
  '/:id',
  authenticateToken,
  async (req, res) => {

    const { id } = req.params;

    try {

      const result = await pool.query(
        `
        SELECT *
        FROM panels
        WHERE id = $1
        AND user_id = $2
        `,
        [
          id,
          req.user.user_id
        ]
      );

      if (result.rows.length === 0) {

        return res.status(404).json({
          error: 'Panel not found'
        });

      }

      res.status(200).json(result.rows[0]);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Internal server error'
      });

    }

  }
);

// ==========================================
// DELETE PANEL
// ==========================================

router.delete(
  '/:id',
  authenticateToken,
  async (req, res) => {

    const { id } = req.params;

    try {

      const result = await pool.query(
        `
        DELETE FROM panels
        WHERE id = $1
        AND user_id = $2
        RETURNING *
        `,
        [
          id,
          req.user.user_id
        ]
      );

      if (result.rows.length === 0) {

        return res.status(404).json({
          error: 'Panel not found'
        });

      }

      res.status(200).json({
        success: true
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Internal server error'
      });

    }

  }
);

module.exports = router;
