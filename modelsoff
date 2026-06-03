const mongoose = require('mongoose');

const spotlightSchema = new mongoose.Schema(
  {
    spotlightId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    badgeText: {
      type: String,
      default: '',
      trim: true,
    },
    buttonText: {
      type: String,
      default: '',
      trim: true,
    },
    buttonUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      default: 'draft',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Spotlight', spotlightSchema);
