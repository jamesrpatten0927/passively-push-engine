const { logSpotlightEvent } = require('../services/spotlightEventsService');
const { EVENT_TYPES, SPOTLIGHT_TYPES } = require('../constants/spotlightEvents');

const recordEvent = async (req, res) => {
  try {
    const {
      website_id,
      spotlight_id,
      spotlight_type,
      event_type,
      visitor_id,
      session_id,
      payload
    } = req.body;

    if (!website_id || !spotlight_id || !spotlight_type || !event_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: website_id, spotlight_id, spotlight_type, event_type are required.'
      });
    }

    const validEventTypes = Object.values(EVENT_TYPES);
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
      });
    }

    const validSpotlightTypes = Object.values(SPOTLIGHT_TYPES);
    if (!validSpotlightTypes.includes(spotlight_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid spotlight_type. Must be one of: ${validSpotlightTypes.join(', ')}`
      });
    }

    console.log(`Spotlight Event Received: website_id=${website_id}, spotlight_id=${spotlight_id}, event_type=${event_type}, spotlight_type=${spotlight_type}`);

    const eventId = await logSpotlightEvent({
      website_id,
      spotlight_id,
      spotlight_type,
      visitor_id,
      session_id,
      event_type,
      payload
    });

    return res.status(200).json({
      success: true,
      event_id: eventId
    });
  } catch (error) {
    console.error('Error recording spotlight event:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  recordEvent
};
