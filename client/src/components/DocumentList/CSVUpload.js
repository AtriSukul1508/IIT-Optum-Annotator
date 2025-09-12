import React, { useState, useRef } from 'react';
import { createDocumentsFromCSV, checkDocumentDuplicates } from '../../services/api';
import './CSVUpload.css';

const CSVUpload = ({ onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState([]);
  const [duplicateData, setDuplicateData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [projectId, setProjectId] = useState(120223);
  const fileInputRef = useRef(null);

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const parseCSVContent = (csvContent) => {
    console.log('=== CSV PARSING START ===');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    console.log('CSV Headers found:', headers);
    console.log('Total lines in CSV:', lines.length);
    
    // Map your actual headers
    const nameIndex = headers.findIndex(h => h === 'name');
    const textIndex = headers.findIndex(h => h === 'text');
    const subjectIdIndex = headers.findIndex(h => h === 'subject_id');
    const hadmIdIndex = headers.findIndex(h => h === 'hadm_id');
    const icdCodeIndex = headers.findIndex(h => h === 'icd_code');
    const idIndex = headers.findIndex(h => h === 'id');
    
    console.log('Column mapping:', {
      name: nameIndex,
      text: textIndex,
      subject_id: subjectIdIndex,
      hadm_id: hadmIdIndex,
      icd_code: icdCodeIndex,
      id: idIndex
    });
    
    // Validation
    if (nameIndex === -1 && subjectIdIndex === -1) {
      throw new Error(`CSV must contain either 'name' or 'subject_id' column. Found columns: ${headers.join(', ')}`);
    }
    if (textIndex === -1) {
      throw new Error(`CSV must contain 'text' column. Found columns: ${headers.join(', ')}`);
    }

    const documents = [];
    let processedRows = 0;
    let skippedRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        skippedRows++;
        continue;
      }

      try {
        const values = parseCSVLine(line);
        
        if (values.length < headers.length) {
          console.warn(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}. Skipping.`);
          skippedRows++;
          continue;
        }
        
        // Create document name
        let documentName = '';
        
        if (nameIndex !== -1 && values[nameIndex]) {
          documentName = values[nameIndex].trim().replace(/^"|"$/g, '');
        } else if (subjectIdIndex !== -1 && hadmIdIndex !== -1 && icdCodeIndex !== -1) {
          const subjectId = values[subjectIdIndex]?.trim().replace(/^"|"$/g, '') || '';
          const hadmId = values[hadmIdIndex]?.trim().replace(/^"|"$/g, '') || '';
          const icdCode = values[icdCodeIndex]?.trim().replace(/^"|"$/g, '') || '';
          documentName = `${subjectId}-${hadmId}-${icdCode}`;
        } else if (subjectIdIndex !== -1) {
          documentName = values[subjectIdIndex]?.trim().replace(/^"|"$/g, '') || '';
        }
        
        const text = values[textIndex]?.trim().replace(/^"|"$/g, '') || '';
        
        // Validation
        if (!documentName || !text || documentName === 'null' || text === 'null') {
          console.warn(`Row ${i + 1}: Missing data - Name: "${documentName}", Text length: ${text.length}. Skipping.`);
          skippedRows++;
          continue;
        }
        
        if (text.length < 10) {
          console.warn(`Row ${i + 1}: Text too short (${text.length} chars). Skipping.`);
          skippedRows++;
          continue;
        }
        
        documents.push({
          name: documentName,
          text: text,
          originalLine: i + 1,
          subject_id: subjectIdIndex !== -1 ? values[subjectIdIndex]?.trim().replace(/^"|"$/g, '') : null,
          hadm_id: hadmIdIndex !== -1 ? values[hadmIdIndex]?.trim().replace(/^"|"$/g, '') : null,
          icd_code: icdCodeIndex !== -1 ? values[icdCodeIndex]?.trim().replace(/^"|"$/g, '') : null,
          original_id: idIndex !== -1 ? values[idIndex]?.trim().replace(/^"|"$/g, '') : null
        });
        
        processedRows++;
        
      } catch (error) {
        console.warn(`Error parsing row ${i + 1}: ${error.message}`);
        skippedRows++;
      }
    }

    console.log(`Parsing complete: ${processedRows} valid documents, ${skippedRows} skipped rows`);
    
    if (documents.length === 0) {
      throw new Error('No valid documents found in CSV. Check that name/text columns contain data.');
    }

    console.log('Sample document:', documents[0]);
    console.log('=== CSV PARSING END ===');
    return documents;
  };

  const handleFileSelection = async (file) => {
    if (!file) return;

    console.log('=== FILE UPLOAD START ===');
    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      const error = 'Please select a CSV file (.csv extension required)';
      onUploadError?.(error);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(30);

      const csvContent = await file.text();
      console.log('File read successfully. Content length:', csvContent.length);
      console.log('Content preview:', csvContent.substring(0, 200) + '...');
      setUploadProgress(30);

      const documents = parseCSVContent(csvContent);
      console.log(`Parsed ${documents.length} documents successfully`);
      setUploadProgress(50);

      // Check for duplicates AND auto-save new documents
      console.log('Checking for duplicates and auto-saving new documents...');
      const response = await checkDocumentDuplicates({
        projectId: projectId,
        documents: documents, // Send full document data including text
        autoSave: true // Enable auto-save on backend
      });

      console.log('Backend response:', response.data);
      setUploadProgress(90);

      const { duplicates, saved_documents, duplicate_count, saved_count, message } = response.data;

      if (saved_count > 0 || duplicate_count > 0) {
        const successMessage = saved_count > 0 
          ? `Successfully uploaded ${saved_count} new documents!` 
          : '';
        const warningMessage = duplicate_count > 0 
          ? ` Found ${duplicate_count} duplicate documents (skipped).` 
          : '';
        
        onUploadSuccess?.({
          total: documents.length,
          uploaded: saved_count,
          skipped: duplicate_count,
          message: successMessage + warningMessage
        });
        console.log(duplicate_count)
        // Show duplicate warning if there were duplicates
        if (duplicate_count > 0) {
          setDuplicateData(duplicates);
          setShowDuplicateWarning(true);
          // setTimeout(() => {
          //   setShowDuplicateWarning(false);
          //   setDuplicateData([]);
          // }, 3000); // Auto-close after 3 seconds
        }
      } else {
        onUploadError?.('No new documents were found to upload.');
      }

      setUploadProgress(100);
      
      // Clean up after 1 second
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('=== FILE UPLOAD ERROR ===');
      console.error('Error details:', error);
      console.error('Response data:', error.response?.data);
      
      const errorMessage = error.response?.data?.error || error.message;
      onUploadError?.(errorMessage);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadDocuments = async (documents) => {
    try {
      console.log('=== UPLOAD START ===');
      console.log(`Uploading ${documents.length} documents to project ${projectId}`);
      setUploadProgress(80);

      const response = await createDocumentsFromCSV({
        projectId: projectId,
        documents: documents
      });

      console.log('Upload response:', response.data);
      setUploadProgress(100);

      onUploadSuccess?.({
        total: documents.length,
        uploaded: response.data.documents.length,
        message: response.data.message
      });

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setShowPreview(true);
        setShowDuplicateWarning(false);
        setPreviewData([]);
        setDuplicateData([]);
        console.log('=== UPLOAD COMPLETE ===');
      }, 1000);

    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Upload error details:', error);
      console.error('Response data:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message;
      onUploadError?.(errorMessage);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const confirmUpload = () => {
    uploadDocuments(previewData);
    setShowPreview(true);
    setShowDuplicateWarning(false);

  };

  const confirmUploadWithDuplicates = (skipDuplicates = true) => {
    if (skipDuplicates) {
      if (previewData.length > 0) {
        uploadDocuments(previewData);
      } else {
        onUploadError?.('No new documents to upload. All documents already exist.');
        setUploading(false);
      }
    } else {
      onUploadError?.('Overwriting existing documents is not currently supported.');
    }
    setShowDuplicateWarning(false);
  };

  const cancelUpload = () => {
    setShowPreview(false);
    setShowDuplicateWarning(false);
    setPreviewData([]);
    setDuplicateData([]);
  };

  return (
    <div className="csv-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {!showPreview && !showDuplicateWarning && (
        <div className="upload-section-wrapper">
          <div
            className={`upload-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!uploading ? triggerFileInput : undefined}
          >
            {uploading ? (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p>Processing documents... {uploadProgress}%</p>
              </div>
            ) : (
              <div className="upload-content">
                <div className="upload-icon">📄</div>
                <h3>Upload CSV Documents</h3>
                <p>Drag and drop your CSV file here, or click to browse</p>
                <small>Expected columns: id, icd_code, subject_id, hadm_id, text, name</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h3>Duplicate Documents Found</h3>
              <p>Found {duplicateData.length} duplicate documents and {previewData.length} new documents.</p>
            </div>
            
            <div className="preview-content">
              {duplicateData.slice(0, 5).map((doc, index) => (
                <div key={index} className="preview-document duplicate">
                  <div className="preview-doc-name">
                    <strong>{doc.name}</strong> (Duplicate)
                  </div>
                  <div className="preview-doc-text">
                    {doc.text.substring(0, 100)}...
                  </div>
                </div>
              ))}
              
              {duplicateData.length > 5 && (
                <div className="preview-more">
                  ... and {duplicateData.length - 5} more duplicates
                </div>
              )}
            </div>
            
            <div className="preview-actions">
              <button 
                className="btn-cancel" 
                onClick={cancelUpload}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={() => confirmUploadWithDuplicates(true)}
                disabled={uploading}
              >
                {uploading ? 'Processing...' : `Continue with ${previewData.length} New Documents`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regular Preview Modal */}
      {showPreview && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h3>Upload Preview</h3>
              <p>Found {previewData.length} new documents. Review and confirm:</p>
            </div>
            
            <div className="preview-content">
              {previewData.slice(0, 5).map((doc, index) => (
                <div key={index} className="preview-document">
                  <div className="preview-doc-name">
                    <strong>{doc.name}</strong>
                  </div>
                  <div className="preview-doc-text">
                    {doc.text.substring(0, 150)}
                    {doc.text.length > 150 ? '...' : ''}
                  </div>
                </div>
              ))}
              
              {previewData.length > 5 && (
                <div className="preview-more">
                  ... and {previewData.length - 5} more documents
                </div>
              )}
            </div>
            
            <div className="preview-actions">
              <button 
                className="btn-cancel" 
                onClick={cancelUpload}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm" 
                onClick={confirmUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : `Upload ${previewData.length} Documents`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVUpload;