const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

router.get('/', documentController.getAllDocuments);
router.get('/:id', documentController.getDocumentById);
router.post('/', documentController.createDocument);
router.put('/:id', documentController.updateDocument);

module.exports = router;