const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Get all documents (both annotated and not annotated)
router.get('/', documentController.getAllDocuments);

// Get only annotated documents (documents with at least one annotation)
router.get('/annotated', documentController.getAnnotatedDocuments);

// Get only not-annotated documents (documents with zero annotations)
router.get('/not-annotated', documentController.getNotAnnotatedDocuments);

// Get document statistics
router.get('/stats', documentController.getDocumentStats);

// Download all annotated documents as JSON
router.get('/download/annotated', documentController.downloadAnnotatedDocuments);

// Download specific documents by IDs
router.post('/download/by-ids', documentController.downloadDocumentsByIds);

// Check for duplicate documents before uploading
router.post('/check-duplicates', documentController.checkDocumentDuplicates);

// Bulk create documents from CSV data
router.post('/bulk', documentController.createDocumentsFromCSV);

// Get specific document by ID
router.get('/:id', documentController.getDocumentById);

// Update document
router.put('/:id', documentController.updateDocument);

module.exports = router;