const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: 100,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
    },
    queueType: {
      type: String,
      enum: ['standard', 'senior'],
      default: 'standard',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required for SMS notifications'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'completed', 'removed'],
      default: 'waiting',
      index: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queue queries
patientSchema.index({ status: 1, position: 1 });

// Virtual: wait time in minutes
patientSchema.virtual('waitTimeMinutes').get(function () {
  const end = this.calledAt || this.completedAt || new Date();
  return Math.round((end - this.joinedAt) / 60000);
});

// Ensure virtuals are included in JSON output
patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
