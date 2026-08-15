const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      default: 'Anonymous',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
      maxlength: 300,
    },
    queueType: {
      type: String,
      enum: ['standard', 'senior'],
      default: 'standard',
    },
  },
  { timestamps: true }
);

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
