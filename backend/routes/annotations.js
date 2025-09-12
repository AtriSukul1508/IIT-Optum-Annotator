const express = require('express');
const router = express.Router();
const annotationController = require('../controllers/annotationController');

// Get all annotations for a document
router.get('/document/:documentId', annotationController.getAnnotations);

// Get annotation statistics for a document
router.get('/document/:documentId/stats', annotationController.getAnnotationStats);

// Add new annotation to a document
router.post('/document/:documentId', annotationController.addAnnotation);

// Update specific annotation
router.put('/document/:documentId/:annotationId', annotationController.updateAnnotation);

// Delete specific annotation
router.delete('/document/:documentId/:annotationId', annotationController.deleteAnnotation);

// Bulk delete multiple annotations from a document
router.delete('/document/:documentId/bulk', annotationController.bulkDeleteAnnotations);

module.exports = router;