const Project = require('../models/Document');

// Get all documents
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
          project: project.name,
          projectId: project.id
        });
      });
    });
    
    res.json(allDocuments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get specific document with annotations
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
    res.status(500).json({ error: error.message });
  }
};

// Create new document
const createDocument = async (req, res) => {
  try {
    const { projectId, name, text } = req.body;
    
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const newDocId = Math.max(...project.documents.map(d => d.id), 0) + 1;
    
    const newDocument = {
      id: newDocId,
      name,
      text,
      annotations: []
    };
    
    project.documents.push(newDocument);
    await project.save();
    
    res.status(201).json(newDocument);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update document
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
        res.json(project.documents[docIndex]);
        break;
      }
    }
    
    if (!updated) {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument
};