const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Initialize pool directly using existing Render environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Safe, idempotent database migration on startup
const migrateDatabase = async () => {
  try {
    // 1. Ensure the base table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS panels (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        text TEXT,
        button_text VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Check for missing columns
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='panels';
    `);
    const existingColumns = res.rows.map(r => r.column_name);

    const columnsToAdd = [];
    if (!existingColumns.includes('status')) columnsToAdd.push(`ADD COLUMN status VARCHAR(20) DEFAULT 'draft'`);
    if (!existingColumns.includes('settings')) columnsToAdd.push(`ADD COLUMN settings JSONB DEFAULT '{}'::jsonb`);
    if (!existingColumns.includes('blocks')) columnsToAdd.push(`ADD COLUMN blocks JSONB DEFAULT '[]'::jsonb`);
    if (!existingColumns.includes('metadata')) columnsToAdd.push(`ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb`);

    // 3. Add missing columns if any
    if (columnsToAdd.length > 0) {
      console.log(`Migration: Adding columns to panels table: ${columnsToAdd.join(', ')}`);
      await pool.query(`ALTER TABLE panels ${columnsToAdd.join(', ')};`);
      console.log('Migration completed successfully.');
    } else {
      console.log('Migration: All columns already exist.');
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
};

// Run migration asynchronously when this module loads
migrateDatabase();

// POST /api/panels - Save or update a panel
router.post('/', async (req, res) => {
  const { id, title, text, buttonText, status, settings, blocks, metadata } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Panel ID is required' });
  }

  const panelStatus = status || 'draft';
  const panelSettings = settings || {};
  const panelBlocks = blocks || [];
  const panelMetadata = metadata || {};

  try {
    const query = `
      INSERT INTO panels (id, title, text, button_text, status, settings, blocks, metadata, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE 
      SET title = EXCLUDED.title,
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/panels - List all panels (for dashboard)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM panels ORDER BY updated_at DESC');
    
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/panels/:id - Fetch a single panel (for widget and editor)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM panels WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/panels/:id - Delete a panel
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM panels WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Panel not found' });
    }
    
    res.status(200).json({ message: 'Panel deleted successfully' });
  } catch (err) {
    console.error('Error deleting panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
