const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  visitDate: { type: Date, default: Date.now },
  patientName: { type: String }, // Store the specific patient name for this visit
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  doctorName: { type: String }, // Storing name for easier display if doctor account is deleted
  symptoms: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  prescription: { type: String, default: '' },
  notes: { type: String, default: '' },
});

const medicalRecordSchema = new mongoose.Schema(
  {
    patientPhone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown'
    },
    allergies: {
      type: [String],
      default: []
    },
    chronicConditions: {
      type: [String],
      default: []
    },
    visits: [visitSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
