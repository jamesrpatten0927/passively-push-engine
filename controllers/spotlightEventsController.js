const pool = require('../config/db');
const { logSpotlightEvent, getSpotlightEventsByUser } = require('../services/spotlightEventsService');
const { sendIntentNotificationEmail } = require('../services/emailService');
const { EVENT_TYPES, SPOTLIGHT_TYPES } = require('../constants/spotlightEvents');
const INTENT_NOTIFICATION_DELAY = 60 * 1000;
const notificationTimers = new Map();
const getNotificationGroupKey = (websiteId, sessionId, payload) => {
  const sequenceId = payload?.sequence_id;
  if (sequenceId) {
    return `${websiteId}:sequence:${sequenceId}`;
  }
  return `${websiteId}:session:${sessionId || 'unknown'}`;
};
const scheduleIntentNotification = ({
  website_id,
  session_id,
  payload
}) => {
  const groupKey = getNotificationGroupKey(website_id, session_id, payload);
  if (notificationTimers.has(groupKey)) {
    return;
  }
  const timer = setTimeout(async () => {
    notificationTimers.delete(groupKey);
    try {
      const sequenceId = payload?.sequence_id;
      let eventsResult;
      if (sequenceId) {
        eventsResult = await pool.query(
          `
          SELECT
            id,
            spotlight_id,
            payload,
            created_at
          FROM spotlight_events
          WHERE website_id = $1
            AND spotlight_type = $2
            AND event_type = $3
            AND notification_sent = FALSE
            AND payload->>'sequence_id' = $4
            AND created_at >= NOW() - INTERVAL '60 seconds'
          ORDER BY created_at ASC
          `,
          [
            website_id,
            SPOTLIGHT_TYPES.INTENT_POLL,
            EVENT_TYPES.ANSWERED,
            sequenceId
          ]
        );
      } else {
        eventsResult = await pool.query(
          `
          SELECT
            id,
            spotlight_id,
            payload,
            created_at
          FROM spotlight_events
          WHERE website_id = $1
            AND spotlight_type = $2
            AND event_type = $3
            AND notification_sent = FALSE
            AND session_id = $4
            AND created_at >= NOW() - INTERVAL '60 seconds'
          ORDER BY created_at ASC
          `,
          [
            website_id,
            SPOTLIGHT_TYPES.INTENT_POLL,
            EVENT_TYPES.ANSWERED,
            session_id
          ]
        );
      }
      const events = eventsResult.rows;
      if (!events.length) {
        return;
      }
      const userResult = await pool.query(
        `
        SELECT email
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [website_id]
      );
      const ownerEmail = userResult.rows[0]?.email;
      if (!ownerEmail) {
        console.warn(
          `No account email found for website_id=${website_id}. Intent notification preserved.`
        );
        return;
      }
      const notificationItems = events.map((event) => ({
        question: event.payload?.spotlight_title || 'Intent Poll',
        answer: event.payload?.answer || event.payload?.option_label || 'Response received'
      }));
      const emailSent = await sendIntentNotificationEmail(
        ownerEmail,
        notificationItems
      );
      if (!emailSent) {
        console.warn(
          `Intent notification email failed for website_id=${website_id}. Events remain unnotified.`
        );
        return;
      }
      const eventIds = events.map((event) => event.id);
      await pool.query(
        `
        UPDATE spotlight_events
        SET notification_sent = TRUE
        WHERE id = ANY($1::int[])
        `,
        [eventIds]
      );
      console.log(
        `Intent notification sent to ${ownerEmail} for ${events.length} response(s).`
      );
    } catch (error) {
      console.error('Error processing Intent Poll notification:', error);
    }
  }, INTENT_NOTIFICATION_DELAY);
  notificationTimers.set(groupKey, timer);
};
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
    console.log(
      `Spotlight Event Received: website_id=${website_id}, spotlight_id=${spotlight_id}, event_type=${event_type}, spotlight_type=${spotlight_type}`
    );
    const eventId = await logSpotlightEvent({
      website_id,
      spotlight_id,
      spotlight_type,
      visitor_id,
      session_id,
      event_type,
      payload
    });
    if (
      spotlight_type === SPOTLIGHT_TYPES.INTENT_POLL &&
      event_type === EVENT_TYPES.ANSWERED
    ) {
      scheduleIntentNotification({
        website_id,
        session_id,
        payload
      });
    }
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
const getEventsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    const events = await getSpotlightEventsByUser(userId);
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching spotlight events:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
module.exports = {
  recordEvent,
  getEventsByUser
};
