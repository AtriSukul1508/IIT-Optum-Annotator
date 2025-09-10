const mongoose = require('mongoose');
const Project = require('../models/Document');
const fs = require('fs');
require('dotenv').config();

var sampleData = undefined;
fs.readFile('./data/data.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  try {
     sampleData = JSON.parse(data);
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});


const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-annotations';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Clear existing data
    const deleteResult = await Project.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing projects`);

    // Insert sample data
    const insertResult = await Project.insertMany(sampleData.projects);
    console.log(`Inserted ${insertResult.length} projects with their documents`);

    // Count total documents
    const totalDocs = insertResult.reduce((sum, project) => sum + project.documents.length, 0);
    console.log(`Total documents seeded: ${totalDocs}`);

    // Count total annotations
    const totalAnnotations = insertResult.reduce((sum, project) => {
      return sum + project.documents.reduce((docSum, doc) => docSum + doc.annotations.length, 0);
    }, 0);
    console.log(`Total annotations added: ${totalAnnotations}`);

    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};


seedDatabase();