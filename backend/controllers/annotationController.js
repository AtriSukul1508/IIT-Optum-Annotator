const Project = require('../models/Document');

// Get annotations for a specific document
const getAnnotations = async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const projects = await Project.find({});
    
    let foundDocument = null;
    
    for (const project of projects) {
      const document = project.documents.find(doc => doc.id === documentId);
      if (document) {
        foundDocument = document;
        break;
      }
    }
    
    if (!foundDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(foundDocument.annotations);
  } catch (error) {
    console.error('Error getting annotations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add new annotation
const addAnnotation = async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const annotationData = req.body;
    
    // Validation
    if (!annotationData.value || !annotationData.cui) {
      return res.status(400).json({ 
        error: 'Missing required fields: value and cui are required' 
      });
    }
    
    if (annotationData.start >= annotationData.end) {
      return res.status(400).json({ 
        error: 'End index must be greater than start index' 
      });
    }
    
    const projects = await Project.find({});
    let updated = false;
    
    for (const project of projects) {
      const docIndex = project.documents.findIndex(doc => doc.id === documentId);
      if (docIndex !== -1) {
        // Generate new annotation ID
        const existingIds = project.documents[docIndex].annotations.map(a => a.id);
        const newAnnotationId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        
        const newAnnotation = {
          id: newAnnotationId,
          user: annotationData.user || 'med_term_extract',
          cui: annotationData.cui,
          value: annotationData.value,
          start: parseInt(annotationData.start),
          end: parseInt(annotationData.end),
          validated: annotationData.validated || false,
          correct: annotationData.correct !== false, // default true
          deleted: annotationData.deleted || false,
          alternative: annotationData.alternative || false,
          killed: annotationData.killed || false,
          last_modified: new Date().toISOString(),
          manually_created: annotationData.manually_created !== false, // default true
          acc: parseFloat(annotationData.acc) || 1,
          meta_anns: annotationData.meta_anns || [
            {
              name: 'Status',
              value: 'Other',
              acc: 1,
              validated: false
            }
          ]
        };
        
        project.documents[docIndex].annotations.push(newAnnotation);
        project.documents[docIndex].last_modified = new Date().toISOString();
        
        await project.save();
        
        console.log(`Added annotation ${newAnnotationId} to document ${documentId}`);
        res.status(201).json(newAnnotation);
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    console.error('Error adding annotation:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update annotation
const updateAnnotation = async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const annotationId = parseInt(req.params.annotationId);
    const updateData = req.body;
    
    // Validation
    if (updateData.start !== undefined && updateData.end !== undefined && 
        updateData.start >= updateData.end) {
      return res.status(400).json({ 
        error: 'End index must be greater than start index' 
      });
    }
    
    const projects = await Project.find({});
    let updated = false;
    
    for (const project of projects) {
      const docIndex = project.documents.findIndex(doc => doc.id === documentId);
      if (docIndex !== -1) {
        const annIndex = project.documents[docIndex].annotations.findIndex(
          ann => ann.id === annotationId
        );
        
        if (annIndex !== -1) {
          // Update annotation fields
          const currentAnnotation = project.documents[docIndex].annotations[annIndex];
          
          const updatedAnnotation = {
            ...currentAnnotation,
            ...updateData,
            id: annotationId, // Ensure ID doesn't change
            last_modified: new Date().toISOString(),
            // Handle specific field types
            start: updateData.start !== undefined ? parseInt(updateData.start) : currentAnnotation.start,
            end: updateData.end !== undefined ? parseInt(updateData.end) : currentAnnotation.end,
            acc: updateData.acc !== undefined ? parseFloat(updateData.acc) : currentAnnotation.acc,
            validated: updateData.validated !== undefined ? updateData.validated : currentAnnotation.validated,
            correct: updateData.correct !== undefined ? updateData.correct : currentAnnotation.correct,
            deleted: updateData.deleted !== undefined ? updateData.deleted : currentAnnotation.deleted,
            alternative: updateData.alternative !== undefined ? updateData.alternative : currentAnnotation.alternative,
            killed: updateData.killed !== undefined ? updateData.killed : currentAnnotation.killed
          };
          
          project.documents[docIndex].annotations[annIndex] = updatedAnnotation;
          project.documents[docIndex].last_modified = new Date().toISOString();
          
          await project.save();
          
          console.log(`Updated annotation ${annotationId} in document ${documentId}`);
          res.json(updatedAnnotation);
          updated = true;
          break;
        }
      }
    }
    
    if (!updated) {
      res.status(404).json({ error: 'Document or annotation not found' });
    }
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete annotation
const deleteAnnotation = async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const annotationId = parseInt(req.params.annotationId);
    
    const projects = await Project.find({});
    let deleted = false;
    
    for (const project of projects) {
      const docIndex = project.documents.findIndex(doc => doc.id === documentId);
      if (docIndex !== -1) {
        const initialLength = project.documents[docIndex].annotations.length;
        
        project.documents[docIndex].annotations = project.documents[docIndex].annotations.filter(
          ann => ann.id !== annotationId
        );
        
        if (project.documents[docIndex].annotations.length < initialLength) {
          project.documents[docIndex].last_modified = new Date().toISOString();
          await project.save();
          
          console.log(`Deleted annotation ${annotationId} from document ${documentId}`);
          res.status(204).send();
          deleted = true;
          break;
        }
      }
    }
    
    if (!deleted) {
      res.status(404).json({ error: 'Document or annotation not found' });
    }
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get annotation statistics
const getAnnotationStats = async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const projects = await Project.find({});
    
    let foundDocument = null;
    
    for (const project of projects) {
      const document = project.documents.find(doc => doc.id === documentId);
      if (document) {
        foundDocument = document;
        break;
      }
    }
    
    if (!foundDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const annotations = foundDocument.annotations;
    const stats = {
      total: annotations.length,
      confirmed: annotations.filter(ann => ann.meta_anns[0]?.value === 'Confirmed').length,
      other: annotations.filter(ann => ann.meta_anns[0]?.value === 'Other').length,
      rejected: annotations.filter(ann => ann.meta_anns[0]?.value === 'Rejected').length,
      validated: annotations.filter(ann => ann.validated).length,
      manually_created: annotations.filter(ann => ann.manually_created).length,
      avg_confidence: annotations.length > 0 ? 
        (annotations.reduce((sum, ann) => sum + (ann.acc || 1), 0) / annotations.length).toFixed(2) : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting annotation stats:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAnnotations,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getAnnotationStats
};