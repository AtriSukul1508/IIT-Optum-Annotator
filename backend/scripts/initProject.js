const mongoose = require('mongoose');
const Project = require('../models/Document');
require('dotenv').config();

/**
 * Initialize default project for document uploads
 * This script creates a default project if none exists
 */

const initializeProject = async () => {
  try {
    console.log('Initializing default project...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Check if any projects exist
    const existingProjects = await Project.find({});
    console.log(`Found ${existingProjects.length} existing projects`);

    if (existingProjects.length === 0) {
      // Create default project
      const defaultProject = new Project({
        name: 'Medical Documents',
        id: 1,
        cuis: '',
        tuis: '',
        documents: []
      });

      await defaultProject.save();
      console.log('✓ Created default project (ID: 1) - "Medical Documents"');
    } else {
      // List existing projects
      console.log('Existing projects:');
      existingProjects.forEach(project => {
        console.log(`  - ID: ${project.id}, Name: "${project.name}", Documents: ${project.documents.length}`);
      });
    }

    // Show project statistics
    let totalDocuments = 0;
    let annotatedDocuments = 0;
    
    for (const project of existingProjects) {
      totalDocuments += project.documents.length;
      project.documents.forEach(doc => {
        if (doc.annotations && doc.annotations.length > 0) {
          annotatedDocuments++;
        }
      });
    }

    console.log('\nProject Statistics:');
    console.log(`Total projects: ${existingProjects.length}`);
    console.log(`Total documents: ${totalDocuments}`);
    console.log(`Annotated documents: ${annotatedDocuments}`);
    console.log(`Not annotated documents: ${totalDocuments - annotatedDocuments}`);

    console.log('\n✓ Project initialization completed!');
    
  } catch (error) {
    console.error('Error initializing project:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

/**
 * Create a specific project
 */
const createProject = async (name, id) => {
  try {
    console.log(`Creating project "${name}" with ID ${id}...`);
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Check if project ID already exists
    const existingProject = await Project.findOne({ id: id });
    if (existingProject) {
      console.log(`❌ Project with ID ${id} already exists: "${existingProject.name}"`);
      return;
    }

    // Create new project
    const newProject = new Project({
      name: name,
      id: parseInt(id),
      cuis: '',
      tuis: '',
      documents: []
    });

    await newProject.save();
    console.log(`✓ Created project "${name}" with ID ${id}`);
    
  } catch (error) {
    console.error('Error creating project:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

/**
 * List all projects
 */
const listProjects = async () => {
  try {
    console.log('Listing all projects...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const projects = await Project.find({}).sort({ id: 1 });

    if (projects.length === 0) {
      console.log('No projects found. Run "node scripts/initProject.js init" to create the default project.');
      return;
    }

    console.log('Project ID | Name                  | Documents | Annotated | Not Annotated');
    console.log('-----------|----------------------|-----------|-----------|---------------');

    for (const project of projects) {
      const totalDocs = project.documents.length;
      const annotatedDocs = project.documents.filter(doc => 
        doc.annotations && doc.annotations.length > 0
      ).length;
      const notAnnotatedDocs = totalDocs - annotatedDocs;
      
      const nameFormatted = project.name.length > 20 ? 
        project.name.substring(0, 17) + '...' : 
        project.name.padEnd(20);
      
      console.log(`${String(project.id).padStart(10)} | ${nameFormatted} | ${String(totalDocs).padStart(9)} | ${String(annotatedDocs).padStart(9)} | ${String(notAnnotatedDocs).padStart(13)}`);
    }

    console.log('\nUse project IDs from the first column when uploading CSV files.');
    
  } catch (error) {
    console.error('Error listing projects:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

/**
 * Delete a project (with confirmation)
 */
const deleteProject = async (projectId) => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const project = await Project.findOne({ id: parseInt(projectId) });
    if (!project) {
      console.log(`❌ Project with ID ${projectId} not found`);
      return;
    }

    console.log(`Found project: "${project.name}" with ${project.documents.length} documents`);
    console.log('WARNING: This will permanently delete the project and all its documents!');
    console.log('Type "yes" to confirm deletion:');
    
    // In a real implementation, you'd use readline for user input
    // For now, we'll just log the warning
    console.log('Deletion cancelled. To confirm deletion, modify this script to bypass confirmation.');
    
  } catch (error) {
    console.error('Error deleting project:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Command line interface
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
  case 'init':
  case 'initialize':
    initializeProject();
    break;
    
  case 'create':
    if (!arg1 || !arg2) {
      console.log('Usage: node scripts/initProject.js create <project_name> <project_id>');
      console.log('Example: node scripts/initProject.js create "Cardiology Documents" 2');
      process.exit(1);
    }
    createProject(arg1, arg2);
    break;
    
  case 'list':
  case 'ls':
    listProjects();
    break;
    
  case 'delete':
  case 'remove':
    if (!arg1) {
      console.log('Usage: node scripts/initProject.js delete <project_id>');
      console.log('Example: node scripts/initProject.js delete 2');
      // process.exit(1);
    }
    deleteProject(arg1);
    break;
    
  default:
    console.log('Medical Document Annotation System - Project Management');
    console.log('Usage: node scripts/initProject.js <command> [arguments]');
    console.log('');
    console.log('Commands:');
    console.log('  init, initialize                     - Create default project if none exists');
    console.log('  create <name> <id>                   - Create a new project');
    console.log('  list, ls                             - List all existing projects');
    console.log('  delete <id>                          - Delete a project (with confirmation)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/initProject.js init');
    console.log('  node scripts/initProject.js create "Neurology Docs" 2');
    console.log('  node scripts/initProject.js list');
    console.log('  node scripts/initProject.js delete 2');
    console.log('');
    console.log('Note: Project IDs are used when uploading CSV files through the web interface.');
    process.exit(1);
}