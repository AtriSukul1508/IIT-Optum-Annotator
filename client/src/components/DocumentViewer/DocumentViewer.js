import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocumentById } from '../../services/api';
import AnnotatedText from './AnnotatedText';
import AnnotationPanel from './AnnotationPanel';
import LoadingSpinner from '../Utils/LoadingSpinner';
import ErrorMessage from '../Utils/ErrorMessage';
import { conceptMatcher, loadBreastCancerConceptsFromFile } from '../../services/conceptMatching';
import { globalConceptManager } from '../../services/globalConceptManager';
import './DocumentViewer.css';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import UploadFileIcon from '@mui/icons-material/UploadFile';


const DocumentViewer = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [project, setProject] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [selectedTextData, setSelectedTextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-highlighting state - now managed globally
  const [autoMatches, setAutoMatches] = useState([]);
  const [showAutoHighlights, setShowAutoHighlights] = useState(false);
  const [globalConceptState, setGlobalConceptState] = useState(globalConceptManager.getState());
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [selectedAutoMatch, setSelectedAutoMatch] = useState(null);

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocument();
    
    // Initialize global concept manager
    globalConceptManager.initializeFromExisting();
    
    // Subscribe to global concept changes
    const unsubscribe = globalConceptManager.subscribe(setGlobalConceptState);
    return unsubscribe;
  }, [id]);

  // Update auto-matches when document or global concepts change
  useEffect(() => {
    if (document && globalConceptState.conceptsLoaded) {
      updateAutoMatches();
    }
  }, [document, globalConceptState.conceptsLoaded]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await getDocumentById(id);
      setDocument(response.data.document);
      setProject(response.data.project);
    } catch (err) {
      setError('Failed to fetch document');
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAutoMatches = () => {
    if (!document || !globalConceptState.conceptsLoaded) return;
    try {
      const matches = conceptMatcher.findMatches(document.text, document.annotations);
      setAutoMatches(matches);
      console.log(`Found ${matches.length} auto-matches for breast cancer concepts`);
    } catch (error) {
      console.error('Error finding concept matches:', error);
    }
  };

  // Handle auto-annotation using default public file
  const handleAutoAnnotate = async () => {
    setLoadingConcepts(true);
    try {
      const response = await fetch('/cdb.txt');
      if (!response.ok) {
        throw new Error(`Could not fetch cdb.txt. Status: ${response.status}`);
      }
      const text = await response.text();
      const file = new File([text], "cdb.txt", { type: "text/plain" });

      const result = await globalConceptManager.loadConcepts(file);
      if (result.success) {
        setShowAutoHighlights(true);
      } else {
        alert(`Failed to load concepts: ${result.error}`);
      }
    } catch (error) {
      alert(`Error loading concepts: ${error.message}`);
    } finally {
      setLoadingConcepts(false);
    }
  };

  // Handle file upload for custom CDB file
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingConcepts(true);
    try {
      const result = await globalConceptManager.loadConcepts(file);
      if (result.success) {
        setShowAutoHighlights(true);
      } else {
        alert(`Failed to load concepts: ${result.error}`);
      }
    } catch (error) {
      alert(`Error uploading concept file: ${error.message}`);
    } finally {
      setLoadingConcepts(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle auto-highlighting
  const toggleAutoHighlights = () => {
    if (!globalConceptState.conceptsLoaded) {
      alert('Please load breast cancer concepts first');
      return;
    }
    setShowAutoHighlights(!showAutoHighlights);
  };

  // Clear concepts globally
  const clearConcepts = () => {
    globalConceptManager.clearConcepts();
    setAutoMatches([]);
    setShowAutoHighlights(false);
    setSelectedAutoMatch(null);
  };

  // Handler functions with improved state management
  const handleAnnotationSelect = (annotation) => {
    setSelectedAnnotation(annotation);
    setSelectedTextData(null);
    setSelectedAutoMatch(null);
  };

  const handleTextSelected = (textData) => {
    setSelectedTextData(textData);
    setSelectedAnnotation(null);
    setSelectedAutoMatch(null);
  };

  const handleAutoMatchSelect = (autoMatch) => {
    setSelectedAutoMatch(autoMatch);
    setSelectedAnnotation(null);
    setSelectedTextData(null);
  };

  const handleAnnotationUpdate = (updatedAnnotation) => {
    if (!document) return;
    
    // Ensure the updated annotation has proper structure
    const properAnnotation = {
      ...updatedAnnotation,
      meta_anns: updatedAnnotation.meta_anns || [{
        name: 'Status',
        value: 'Other',
        acc: 1,
        validated: false
      }]
    };
    
    const updatedAnnotations = document.annotations.map(ann =>
      ann.id === properAnnotation.id ? properAnnotation : ann
    );
    
    setDocument({ ...document, annotations: updatedAnnotations });
    
    if (selectedAnnotation && selectedAnnotation.id === properAnnotation.id) {
      setSelectedAnnotation(properAnnotation);
    }
    updateAutoMatches();
  };

  const handleAnnotationAdd = (newAnnotation) => {
    if (!document) return;
    
    // Ensure the new annotation has proper structure
    const properAnnotation = {
      ...newAnnotation,
      meta_anns: newAnnotation.meta_anns || [{
        name: 'Status',
        value: 'Other',
        acc: 1,
        validated: false
      }]
    };
    
    const updatedAnnotations = [...document.annotations, properAnnotation];
    setDocument({ ...document, annotations: updatedAnnotations });
    
    // Clear the text selection and auto-match selection
    setSelectedTextData(null);
    setSelectedAutoMatch(null);
    
    // Auto-select the new annotation to show its details
    setTimeout(() => {
      setSelectedAnnotation(properAnnotation);
    }, 100);
    
    updateAutoMatches();
  };

  const handleAnnotationDelete = (deletedAnnotationId) => {
    if (!document) return;
    const updatedAnnotations = document.annotations.filter(ann => ann.id !== deletedAnnotationId);
    setDocument({ ...document, annotations: updatedAnnotations });
    if (selectedAnnotation && selectedAnnotation.id === deletedAnnotationId) {
      setSelectedAnnotation(null);
    }
    updateAutoMatches();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!document) return <ErrorMessage message="Document not found" />;

  return (
    <div className="document-viewer">
      <div className="document-viewer-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>{document.name}</h1>
        <div className="document-meta">
          <span>Project: {project?.name}</span>
          <span>Doc ID: {document.id}</span>
          <span>Manual Annotations: {document.annotations.length}</span>
          {autoMatches.length > 0 && (
            <span>Auto-detected Entities: {autoMatches.length}</span>
          )}
        </div>
      </div>

      {/* Concept Loading Controls */}
      <div className="concept-controls">
        <div className="concept-controls-header">
          <h3>Breast Cancer Concept Highlighting</h3>
        </div>
        
        <div className="concept-controls-body">
          {!globalConceptState.conceptsLoaded ? (
            <div className="concept-loader">
              <button 
                onClick={handleAutoAnnotate} 
                disabled={loadingConcepts}
                className='annotate-button'
              >
                {loadingConcepts ? 'Annotating...' : <span><AutoFixHighIcon/> Auto-annotate</span>}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingConcepts}
                style={{ marginLeft: '10px' }}
                className='cdb-upload-button'
              >
                <UploadFileIcon/>
                Upload a CSV File
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={loadingConcepts}
              />
            </div>
          ) : (
            <div className="concept-controls-actions">
              <span className="concepts-loaded-info">
                Concepts loaded from {globalConceptState.loadedFileName} ({globalConceptState.totalConcepts} concepts)
              </span>
              <button
                onClick={toggleAutoHighlights}
                className={`btn-edit ${showAutoHighlights ? 'active' : ''}`}
              >
                {showAutoHighlights ? 'Hide Auto-Highlights' : 'Show Auto-Highlights'}
              </button>
              <button
                onClick={clearConcepts}
                className="btn-danger"
              >
                Clear Concepts
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="document-viewer-content">
        <div className="document-text-container">
          <div className="document-text-header">
            <h2>Discharge Summary Text</h2>
            <div className="text-instructions">
              <small>
                You can select text to create a new annotation
                {showAutoHighlights && (
                  <span> • Purple highlights are auto-detected breast cancer terms</span>
                )}
              </small>
            </div>
          </div>
          <div className="document-text">
            <AnnotatedText
              text={document.text}
              annotations={document.annotations}
              onAnnotationSelect={handleAnnotationSelect}
              selectedAnnotation={selectedAnnotation}
              onTextSelected={handleTextSelected}
              onDeleteAnnotation={handleAnnotationDelete}
              autoMatches={autoMatches}
              showAutoHighlights={showAutoHighlights}
              onAutoMatchSelect={handleAutoMatchSelect}
            />
          </div>
        </div>

        <div className="annotation-panel-container">
          <AnnotationPanel
            annotations={document.annotations}
            selectedAnnotation={selectedAnnotation}
            onAnnotationSelect={handleAnnotationSelect}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationAdd={handleAnnotationAdd}
            onAnnotationDelete={handleAnnotationDelete}
            documentId={document.id}
            selectedTextData={selectedTextData}
            updateSelectedTextData={setSelectedTextData}
            selectedAutoMatch={selectedAutoMatch}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
