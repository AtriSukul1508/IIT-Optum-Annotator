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
  // New field to track annotation status
  is_annotated: { type: Boolean, default: false },
  // Track when first annotation was added
  first_annotation_date: { type: Date, default: null },
  annotations: [annotationSchema]
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: Number, required: true, unique: true },
  cuis: { type: String, default: '' },
  tuis: { type: String, default: '' },
  documents: [documentSchema]
});

// Pre-save middleware to automatically update is_annotated status
documentSchema.pre('save', function(next) {
  if (this.annotations && this.annotations.length > 0 && !this.is_annotated) {
    this.is_annotated = true;
    this.first_annotation_date = new Date();
  } else if (this.annotations && this.annotations.length === 0 && this.is_annotated) {
    this.is_annotated = false;
    this.first_annotation_date = null;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
