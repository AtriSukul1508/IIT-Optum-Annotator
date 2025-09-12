const Project = require('../models/Document');

const getAllDocuments = async (req, res) => {
  try {
    const projects = await Project.find({});
    const allDocuments = [];
    
    projects.forEach(project => {
      project.documents.forEach(doc => {
        allDocuments.push({
          id: doc.id,
          name: doc.name,
          text: doc.text,
          textSnippet: doc.text.substring(0, 150) + (doc.text.length > 150 ? '...' : ''),
          last_modified: doc.last_modified,
          is_annotated: doc.is_annotated || false,
          first_annotation_date: doc.first_annotation_date,
          annotation_count: doc.annotations ? doc.annotations.length : 0,
          project: project.name,
          projectId: project.id
        });
      });
    });
    
    res.json(allDocuments);
  } catch (error) {
    console.error('Error getting all documents:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAnnotatedDocuments = async (req, res) => {
  try {
    const projects = await Project.find({});
    const annotatedDocuments = [];
    
    projects.forEach(project => {
      project.documents.forEach(doc => {
        // Only include documents that have annotations
        if (doc.annotations && doc.annotations.length > 0) {
          annotatedDocuments.push({
            id: doc.id,
            name: doc.name,
            text: doc.text,
            textSnippet: doc.text.substring(0, 150) + (doc.text.length > 150 ? '...' : ''),
            last_modified: doc.last_modified,
            is_annotated: true,
            first_annotation_date: doc.first_annotation_date,
            annotation_count: doc.annotations.length,
            project: project.name,
            projectId: project.id
          });
        }
      });
    });
    
    res.json(annotatedDocuments);
  } catch (error) {
    console.error('Error getting annotated documents:', error);
    res.status(500).json({ error: error.message });
  }
};


const getNotAnnotatedDocuments = async (req, res) => {
  try {
    const projects = await Project.find({});
    const notAnnotatedDocuments = [];
    
    projects.forEach(project => {
      project.documents.forEach(doc => {
        
        if (!doc.annotations || doc.annotations.length === 0) {
          notAnnotatedDocuments.push({
            id: doc.id,
            name: doc.name,
            text: doc.text,
            textSnippet: doc.text.substring(0, 150) + (doc.text.length > 150 ? '...' : ''),
            last_modified: doc.last_modified,
            is_annotated: false,
            first_annotation_date: null,
            annotation_count: 0,
            project: project.name,
            projectId: project.id
          });
        }
      });
    });
    
    res.json(notAnnotatedDocuments);
  } catch (error) {
    console.error('Error getting not annotated documents:', error);
    res.status(500).json({ error: error.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const projects = await Project.find({});
    
    let foundDocument = null;
    let foundProject = null;
    
    for (const project of projects) {
      const document = project.documents.find(doc => doc.id === documentId);
      if (document) {
        foundDocument = document;
        foundProject = project;
        break;
      }
    }
    
    if (!foundDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({
      document: foundDocument,
      project: {
        name: foundProject.name,
        id: foundProject.id,
        cuis: foundProject.cuis,
        tuis: foundProject.tuis
      }
    });
  } catch (error) {
    console.error('Error getting document by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

const createDocumentsFromCSV = async (req, res) => {
  try {
    const { projectId, documents } = req.body;
    
    // Validation
    if (!projectId || !documents || !Array.isArray(documents)) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId and documents array are required' 
      });
    }
    
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    // Generate new document IDs
    const existingIds = project.documents.map(d => d.id);
    let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    console.log(projectId, documents,nextId,existingIds)
    
    const newDocuments = documents.map((docData, index) => {
      if (!docData.name || !docData.text) {
        throw new Error(`Document at index ${index} is missing name or text`);
      }
      
      return {
        id: nextId++,
        name: docData.name,
        text: docData.text,
        is_annotated: false,
        first_annotation_date: null,
        annotations: []
      };
    });
    
    project.documents.push(...newDocuments);
    await project.save();
    
    console.log(`Created ${newDocuments.length} documents in project: ${projectId}`);
    res.status(201).json({
      message: `Successfully created ${newDocuments.length} documents`,
      documents: newDocuments,
      total_documents: project.documents.length
    });
  } catch (error) {
    console.error('Error creating documents from CSV:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const { name, text } = req.body;
    
    const projects = await Project.find({});
    let updated = false;
    
    for (const project of projects) {
      const docIndex = project.documents.findIndex(doc => doc.id === documentId);
      if (docIndex !== -1) {
        if (name) project.documents[docIndex].name = name;
        if (text) project.documents[docIndex].text = text;
        project.documents[docIndex].last_modified = new Date();
        
        await project.save();
        updated = true;
        
        console.log(`Updated document: ${documentId}`);
        res.json(project.documents[docIndex]);
        break;
      }
    }
    
    if (!updated) {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error.message });
  }
};


const getDocumentStats = async (req, res) => {
  try {
    const projects = await Project.find({});
    let totalDocuments = 0;
    let annotatedDocuments = 0;
    let notAnnotatedDocuments = 0;
    let totalAnnotations = 0;
    
    projects.forEach(project => {
      project.documents.forEach(doc => {
        totalDocuments++;
        if (doc.annotations && doc.annotations.length > 0) {
          annotatedDocuments++;
          totalAnnotations += doc.annotations.length;
        } else {
          notAnnotatedDocuments++;
        }
      });
    });
    
    const stats = {
      total_documents: totalDocuments,
      annotated_documents: annotatedDocuments,
      not_annotated_documents: notAnnotatedDocuments,
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting document stats:', error);
    res.status(500).json({ error: error.message });
  }
};








/**
 * Check for duplicate documents and optionally save non-duplicates
 */
const checkDocumentDuplicates = async (req, res) => {
  try {
    const { projectId, documents, autoSave = true } = req.body; // autoSave defaults to true
    
    // Validation
    if (!projectId || !documents || !Array.isArray(documents)) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId and documents array are required' 
      });
    }
    
    console.log(`Checking duplicates for ${documents.length} documents in project ${projectId}`);
    
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Extract document names to check
    const documentNames = documents.map(doc => doc.name);
    
    // Find existing document names in the project
    const existingDocuments = project.documents.filter(doc => 
      documentNames.includes(doc.name)
    );
    
    const duplicates = existingDocuments.map(doc => ({
      name: doc.name,
      id: doc.id,
      is_annotated: doc.is_annotated || false,
      annotation_count: doc.annotations ? doc.annotations.length : 0
    }));
    
    // Filter out duplicates to get new documents
    const duplicateNames = new Set(duplicates.map(d => d.name));
    const newDocuments = documents.filter(doc => !duplicateNames.has(doc.name));
    
    console.log(`Found ${duplicates.length} duplicates, ${newDocuments.length} new documents`);
    
    let savedDocuments = [];
    
    // Auto-save new documents if autoSave is true
    if (autoSave && newDocuments.length > 0) {
      console.log(`Auto-saving ${newDocuments.length} new documents...`);
      
      try {
        // Generate new document IDs
        const existingIds = project.documents.map(d => d.id);
        let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        
        const documentsToAdd = newDocuments.map((docData, index) => {
          // Validate required fields
          if (!docData.name || !docData.text) {
            throw new Error(`Document at index ${index} is missing name or text`);
          }
          
          return {
            id: nextId++,
            name: docData.name,
            text: docData.text,
            is_annotated: false,
            first_annotation_date: null,
            last_modified: new Date(),
            annotations: []
          };
        });
        
        // Add documents to project
        project.documents.push(...documentsToAdd);
        
        // Save to database
        await project.save();
        
        savedDocuments = documentsToAdd;
        console.log(`Successfully saved ${savedDocuments.length} new documents to project ${projectId}`);
        
      } catch (saveError) {
        console.error('Error saving new documents:', saveError);
        // Return error but still include duplicate info
        return res.status(500).json({ 
          error: `Failed to save new documents: ${saveError.message}`,
          duplicates: duplicates,
          total_checked: documentNames.length,
          duplicate_count: duplicates.length,
          new_count: newDocuments.length,
          saved_count: 0
        });
      }
    }
    
    res.json({
      duplicates: duplicates,
      new_documents: autoSave ? [] : newDocuments, // Don't return full documents if auto-saved
      saved_documents: savedDocuments,
      total_checked: documentNames.length,
      duplicate_count: duplicates.length,
      new_count: newDocuments.length,
      saved_count: savedDocuments.length,
      auto_saved: autoSave && savedDocuments.length > 0,
      message: autoSave && savedDocuments.length > 0 ? 
        `Successfully saved ${savedDocuments.length} new documents. Found ${duplicates.length} duplicates.` :
        `Found ${duplicates.length} duplicates out of ${documentNames.length} documents.`
    });
    
  } catch (error) {
    console.error('Error checking document duplicates:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download all annotated documents as JSON
 */
const downloadAnnotatedDocuments = async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;
    const projects = await Project.find(projectId ? { id: projectId } : {});
    
    if (projectId && projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const annotatedDocuments = [];
    
    projects.forEach(project => {
      project.documents.forEach(doc => {
        // Only include documents that have annotations
        if (doc.annotations && doc.annotations.length > 0) {
          annotatedDocuments.push({
            id: doc.id,
            name: doc.name,
            text: doc.text,
            last_modified: doc.last_modified,
            annotations: doc.annotations.map(ann => ({
              id: ann.id,
              user: ann.user,
              cui: ann.cui,
              value: ann.value,
              start: ann.start,
              end: ann.end,
              validated: ann.validated,
              correct: ann.correct,
              deleted: ann.deleted,
              alternative: ann.alternative,
              killed: ann.killed,
              last_modified: ann.last_modified,
              manually_created: ann.manually_created,
              acc: ann.acc,
              meta_anns: ann.meta_anns
            }))
          });
        }
      });
    });
    
    if (annotatedDocuments.length === 0) {
      return res.status(404).json({ 
        error: projectId ? 
          `No annotated documents found in project ${projectId}` : 
          'No annotated documents found'
      });
    }
    
    // Create export data with metadata
    const exportData = {
      projects: [{
      name: "IITM Optum",
      id: 14,
      cuis: "",
      tuis: "T047,T191,T046,T184,T049,T019,T048,T200,T121,T109,T195,T123,T125,T127,T061,T060,T059,T023,T029,T017,T030,T033,T082",
      documents: annotatedDocuments
      }]
    };
    
    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const projectSuffix = projectId ? `_project_${projectId}` : '';
    const filename = `annotated_documents${projectSuffix}_${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    console.log(`Downloaded ${annotatedDocuments.length} annotated documents`);
    res.json(exportData);
    
  } catch (error) {
    console.error('Error downloading annotated documents:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download specific documents by IDs
 */
const downloadDocumentsByIds = async (req, res) => {
  try {
    const { document_ids } = req.body;
    
    if (!document_ids || !Array.isArray(document_ids)) {
      return res.status(400).json({ 
        error: 'document_ids array is required' 
      });
    }
    
    const projects = await Project.find({});
    const requestedDocuments = [];
    
    projects.forEach(project => {
      project.documents.forEach(doc => {
        if (document_ids.includes(doc.id)) {
          requestedDocuments.push({
            id: doc.id,
            name: doc.name,
            text: doc.text,
            last_modified: doc.last_modified,
            is_annotated: doc.is_annotated,
            first_annotation_date: doc.first_annotation_date,
            project: {
              id: project.id,
              name: project.name,
              cuis: project.cuis,
              tuis: project.tuis
            },
            annotations: doc.annotations || []
          });
        }
      });
    });
    
    if (requestedDocuments.length === 0) {
      return res.status(404).json({ 
        error: 'No documents found with the provided IDs'
      });
    }
    
    // Create export data
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        total_documents: requestedDocuments.length,
        requested_ids: document_ids,
        version: '1.0'
      },
      documents: requestedDocuments
    };
    
    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `selected_documents_${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    console.log(`Downloaded ${requestedDocuments.length} selected documents`);
    res.json(exportData);
    
  } catch (error) {
    console.error('Error downloading selected documents:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDocuments,
  getAnnotatedDocuments,
  getNotAnnotatedDocuments,
  getDocumentById,
  createDocumentsFromCSV,
  updateDocument,
  getDocumentStats,
  downloadDocumentsByIds,
  checkDocumentDuplicates,
  downloadAnnotatedDocuments
};