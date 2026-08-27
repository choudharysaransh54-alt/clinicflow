const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    department: {
      type: String,
    },
    roleDuringShift: {
      type: String, // e.g. "On-Call", "Attending"
    },
  },
  {
    timestamps: true,
  }
);

// Prevent overlapping shifts for the same staff member
shiftSchema.index({ staffId: 1, startTime: 1, endTime: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
