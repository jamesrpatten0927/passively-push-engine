const db = require('../config/db');
const crypto = require('crypto');

const getCategories = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await db.query(
      'SELECT * FROM knowledge_categories WHERE user_id = $1 ORDER BY display_order ASC, created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;
    const userId = req.user.user_id;
    const id = 'kc_' + crypto.randomUUID().replace(/-/g, '');
    
    // Get max display_order
    const maxSortResult = await db.query(
      'SELECT COALESCE(MAX(display_order), -1) as max_sort FROM knowledge_categories WHERE user_id = $1',
      [userId]
    );
    const nextSort = maxSortResult.rows[0].max_sort + 1;

    const result = await db.query(
      `INSERT INTO knowledge_categories (id, user_id, name, slug, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, name, slug || null, nextSort]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;
    const userId = req.user.user_id;
    
    const result = await db.query(
      `UPDATE knowledge_categories 
       SET name = $1, slug = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name, slug || null, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    // Deleting the category will cascade to the junction table knowledge_overlay_categories
    const result = await db.query(
      'DELETE FROM knowledge_categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const reorderCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body;
    const userId = req.user.user_id;
    
    for (let i = 0; i < categoryIds.length; i++) {
      await db.query(
        'UPDATE knowledge_categories SET display_order = $1 WHERE id = $2 AND user_id = $3',
        [i, categoryIds[i], userId]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPublicCategories = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      'SELECT id, name, slug FROM knowledge_categories WHERE user_id = $1 ORDER BY display_order ASC, created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching public categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getPublicCategories
};
