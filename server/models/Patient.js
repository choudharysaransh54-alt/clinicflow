const mongoose = require('mongoose');
require('./Staff');

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
    aiScreening: {
      urgency: { type: String, enum: ['🔴 High', '🟡 Medium', '🟢 Normal'], default: '🟢 Normal' },
      conditions: [{ type: String }],
      specialty: { type: String },
      screenedAt: { type: Date }
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
      enum: [
        'registered',
        'waiting_general',
        'waiting_doctor',
        'with_doctor',
        'transferred',
        'completed',
        'no_show',
      ],
      default: 'registered',
      index: true,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    priority: {
      type: Number,
      default: 0,
    },
    consultationStartAt: {
      type: Date,
      default: null,
    },
    missedCalls: {
      type: Number,
      default: 0,
    },
    transferHistory: [
      {
        fromDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
        toDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
        reason: String,
        transferredAt: { type: Date, default: Date.now },
      },
    ],
    auditLog: [
      {
        fromStatus: String,
        toStatus: String,
        actorId: String,
        actorRole: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    position: {
      type: Number,
      default: 0, // Keeping this for backward compatibility if needed, though Redis sorted sets will handle queue order
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

// Indexes
patientSchema.index({ status: 1, priority: -1, joinedAt: 1 });
patientSchema.index({ assignedDoctor: 1, status: 1 });

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
