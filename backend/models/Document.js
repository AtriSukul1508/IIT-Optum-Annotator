const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  user: { type: String, required: true },
  cui: { type: String, required: true },
  value: { type: String, required: true },
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  validated: { type: Boolean, default: false },
  correct: { type: Boolean, default: true },
  deleted: { type: Boolean, default: false },
  alternative: { type: Boolean, default: false },
  killed: { type: Boolean, default: false },
  last_modified: { type: Date, default: Date.now },
  manually_created: { type: Boolean, default: false },
  acc: { type: Number, default: 1 },
  meta_anns: [{
    name: { type: String, required: true },
    value: { type: String, required: true },
    acc: { type: Number, default: 1 },
    validated: { type: Boolean, default: false }
  }]
});

const documentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  text: { type: String, required: true },
  last_modified: { type: Date, default: Date.now },
  annotations: [annotationSchema]
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: Number, required: true, unique: true },
  cuis: { type: String, default: '' },
  tuis: { type: String, default: '' },
  documents: [documentSchema]
});

module.exports = mongoose.model('Project', projectSchema);