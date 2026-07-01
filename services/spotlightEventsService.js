const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const logSpotlightEvent = async (eventData) => {
  const {
    website_id,
    spotlight_id,
    spotlight_type,
    visitor_id,
    session_id,
    event_type,
    payload
  } = eventData;

  const query = `
    INSERT INTO spotlight_events (
      website_id,
      spotlight_id,
      spotlight_type,
      visitor_id,
      session_id,
      event_type,
      payload,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id;
  `;

  const values = [
    website_id,
    spotlight_id,
    spotlight_type,
    visitor_id || null,
    session_id || null,
    event_type,
    payload ? JSON.stringify(payload) : null
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
};

module.exports = {
  logSpotlightEvent
};
