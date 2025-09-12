const mongoose = require('mongoose');
const Project = require('../models/Document');
require('dotenv').config();


const migrateDocuments = async () => {
  try {
    console.log('Starting document migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Find all projects
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects to migrate`);

    let totalDocuments = 0;
    let updatedDocuments = 0;
    let documentsWithAnnotations = 0;

    // Process each project
    for (const project of projects) {
      console.log(`\nProcessing project: ${project.name} (ID: ${project.id})`);
      
      let projectUpdated = false;
      
      // Process each document in the project
      for (let i = 0; i < project.documents.length; i++) {
        const document = project.documents[i];
        totalDocuments++;
        
        // Check if document already has the new fields
        if (document.is_annotated === undefined || document.first_annotation_date === undefined) {
          const hasAnnotations = document.annotations && document.annotations.length > 0;
          
          // Set annotation status
          document.is_annotated = hasAnnotations;
          
          // Set first annotation date if document has annotations
          if (hasAnnotations) {
            documentsWithAnnotations++;
            
            // Find the earliest annotation date
            const sortedAnnotations = document.annotations.sort((a, b) => {
              const dateA = new Date(a.last_modified || '2023-01-01');
              const dateB = new Date(b.last_modified || '2023-01-01');
              return dateA - dateB;
            });
            
            document.first_annotation_date = sortedAnnotations[0].last_modified || new Date('2023-01-01');
            console.log(`  ✓ Document "${document.name}" marked as annotated (${document.annotations.length} annotations)`);
          } else {
            document.first_annotation_date = null;
            console.log(`  • Document "${document.name}" marked as not annotated`);
          }
          
          updatedDocuments++;
          projectUpdated = true;
        } else {
          console.log(`  - Document "${document.name}" already migrated`);
        }
      }
      
      // Save project if any documents were updated
      if (projectUpdated) {
        await project.save();
        console.log(`✓ Saved project: ${project.name}`);
      }
    }

    // Display migration summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total documents processed: ${totalDocuments}`);
    console.log(`Documents updated: ${updatedDocuments}`);
    console.log(`Documents with annotations: ${documentsWithAnnotations}`);
    console.log(`Documents without annotations: ${totalDocuments - documentsWithAnnotations}`);
    console.log('='.repeat(60));

    // Verify migration results
    console.log('\nVerifying migration results...');
    const verificationProjects = await Project.find({});
    let verifiedAnnotated = 0;
    let verifiedNotAnnotated = 0;
    
    verificationProjects.forEach(project => {
      project.documents.forEach(doc => {
        if (doc.is_annotated) {
          verifiedAnnotated++;
        } else {
          verifiedNotAnnotated++;
        }
      });
    });
    
    console.log(`Verified annotated documents: ${verifiedAnnotated}`);
    console.log(`Verified not-annotated documents: ${verifiedNotAnnotated}`);
    console.log('✓ Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

/**
 * Helper function to rollback migration (removes added fields)
 */
const rollbackMigration = async () => {
  try {
    console.log('Starting migration rollback...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Find all projects and remove the added fields
    const result = await Project.updateMany(
      {},
      {
        $unset: {
          'documents.$[].is_annotated': 1,
          'documents.$[].first_annotation_date': 1
        }
      }
    );

    console.log(`Rollback completed. Modified ${result.modifiedCount} projects`);
    
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

/**
 * Utility function to validate migration
 */
const validateMigration = async () => {
  try {
    console.log('Validating migration...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const projects = await Project.find({});
    let validationErrors = [];
    
    projects.forEach((project, projectIndex) => {
      project.documents.forEach((doc, docIndex) => {
        // Check if required fields exist
        if (doc.is_annotated === undefined) {
          validationErrors.push(`Project ${project.name}, Document ${doc.name}: missing is_annotated field`);
        }
        
        // Check consistency between is_annotated and annotations array
        const hasAnnotations = doc.annotations && doc.annotations.length > 0;
        if (doc.is_annotated !== hasAnnotations) {
          validationErrors.push(`Project ${project.name}, Document ${doc.name}: is_annotated (${doc.is_annotated}) doesn't match annotations presence (${hasAnnotations})`);
        }
        
        // Check first_annotation_date consistency
        if (doc.is_annotated && !doc.first_annotation_date) {
          validationErrors.push(`Project ${project.name}, Document ${doc.name}: annotated but missing first_annotation_date`);
        }
        
        if (!doc.is_annotated && doc.first_annotation_date) {
          validationErrors.push(`Project ${project.name}, Document ${doc.name}: not annotated but has first_annotation_date`);
        }
      });
    });
    
    if (validationErrors.length === 0) {
      console.log('✓ Migration validation passed - all documents are consistent');
    } else {
      console.log(`❌ Migration validation failed - ${validationErrors.length} errors found:`);
      validationErrors.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('Validation failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    migrateDocuments();
    break;
  case 'rollback':
    rollbackMigration();
    break;
  case 'validate':
    validateMigration();
    break;
  default:
    console.log('Usage: node migrate.js [migrate|rollback|validate]');
    console.log('Commands:');
    console.log('  migrate  - Add annotation status fields to existing documents');
    console.log('  rollback - Remove annotation status fields from documents');
    console.log('  validate - Check migration consistency');
    process.exit(1);
}