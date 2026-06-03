const Spotlight = require('../models/Spotlight');
const crypto = require('crypto');

exports.createSpotlight = async (req, res) => {
  try {
    const { userId, title, body, badgeText, buttonText, buttonUrl, status } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const spotlightId = `spotlight_${crypto.randomBytes(8).toString('hex')}`;

    const spotlight = new Spotlight({
      spotlightId,
      userId,
      title,
      body,
      badgeText,
      buttonText,
      buttonUrl,
      status: status || 'draft',
    });

    await spotlight.save();

    res.status(201).json(spotlight);
  } catch (error) {
    console.error('Error creating spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;
    const updates = req.body;

    // Prevent updating immutable fields
    delete updates.spotlightId;
    delete updates.userId;

    const spotlight = await Spotlight.findOneAndUpdate(
      { spotlightId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!spotlight) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(spotlight);
  } catch (error) {
    console.error('Error updating spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;

    const spotlight = await Spotlight.findOneAndDelete({ spotlightId });

    if (!spotlight) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json({ message: 'Spotlight deleted successfully' });
  } catch (error) {
    console.error('Error deleting spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSpotlight = async (req, res) => {
  try {
    const { spotlightId } = req.params;

    const spotlight = await Spotlight.findOne({ spotlightId });

    if (!spotlight) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(spotlight);
  } catch (error) {
    console.error('Error fetching spotlight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserSpotlights = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const spotlights = await Spotlight.find(query).sort({ createdAt: -1 });

    res.status(200).json(spotlights);
  } catch (error) {
    console.error('Error fetching user spotlights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.toggleSpotlightStatus = async (req, res) => {
  try {
    const { spotlightId } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const spotlight = await Spotlight.findOneAndUpdate(
      { spotlightId },
      { $set: { status } },
      { new: true }
    );

    if (!spotlight) {
      return res.status(404).json({ error: 'Spotlight not found' });
    }

    res.status(200).json(spotlight);
  } catch (error) {
    console.error('Error toggling spotlight status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
