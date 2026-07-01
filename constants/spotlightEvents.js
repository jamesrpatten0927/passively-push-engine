const EVENT_TYPES = {
  SHOWN: 'shown',
  ANSWERED: 'answered',
  DISMISSED: 'dismissed',
  MINIMIZED: 'minimized',
  CTA_CLICKED: 'cta_clicked',
  COMPLETED: 'completed',
  OPTED_IN: 'opted_in'
};

const SPOTLIGHT_TYPES = {
  GENERAL: 'general',
  INTENT: 'intent',
  INTENT_POLL: 'intent_poll',
  CONTEXTUAL_OPTIN: 'contextual_optin'
};

module.exports = {
  EVENT_TYPES,
  SPOTLIGHT_TYPES
};
