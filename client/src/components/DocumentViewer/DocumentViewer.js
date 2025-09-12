import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocumentById } from '../../services/api';
import AnnotatedText from './AnnotatedText';
import AnnotationPanel from './AnnotationPanel';
import LoadingSpinner from '../Utils/LoadingSpinner';
import ErrorMessage from '../Utils/ErrorMessage';
import { conceptMatcher, loadBreastCancerConceptsFromFile } from '../../services/conceptMatching';
import './DocumentViewer.css';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';



const DocumentViewer = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [project, setProject] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [selectedTextData, setSelectedTextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New state for auto-highlighting
  const [autoMatches, setAutoMatches] = useState([]);
  const [showAutoHighlights, setShowAutoHighlights] = useState(false);
  const [conceptsLoaded, setConceptsLoaded] = useState(false);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [selectedAutoMatch, setSelectedAutoMatch] = useState(null);
  const [loadedFileName, setLoadedFileName] = useState('');

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  // Update auto-matches when document or concepts change
  useEffect(() => {
    if (document && conceptsLoaded) {
      updateAutoMatches();
    }
  }, [document, conceptsLoaded]);

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
    if (!document || !conceptsLoaded) return;
    try {
      const matches = conceptMatcher.findMatches(document.text, document.annotations);
      setAutoMatches(matches);
      console.log(`Found ${matches.length} auto-matches for breast cancer concepts`);
    } catch (error) {
      console.error('Error finding concept matches:', error);
    }
  };

  // NEW: Handle auto-annotation by fetching cdb.txt from the public folder
  const handleAutoAnnotate = async () => {
    setLoadingConcepts(true);
    try {
      // Fetches the file from the public directory of your React app
      const response = await fetch('/cdb.txt');
      if (!response.ok) {
        throw new Error(`Could not fetch cdb.txt. Please ensure it's in the /public folder. Status: ${response.status}`);
      }
      const text = await response.text();
      const file = new File([text], "cdb.txt", { type: "text/plain" });

      // Reuse the existing file processing logic
      await processConceptFile(file);

    } catch (error) {
      alert(`Error loading concepts automatically: ${error.message}`);
    } finally {
      setLoadingConcepts(false);
    }
  };


  // Helper function to process the concept file (from fetch or upload)
  const processConceptFile = async (file) => {
    const result = await loadBreastCancerConceptsFromFile(file);
    if (result.success) {
      setConceptsLoaded(true);
      setLoadedFileName(result.fileName);
      // alert(result.message);
      // Auto-enable highlighting after loading
      setShowAutoHighlights(true);
    } else {
      alert(`Failed to load concepts: ${result.error}`);
    }
  };

  // Toggle auto-highlighting
  const toggleAutoHighlights = () => {
    if (!conceptsLoaded) {
      alert('Please load breast cancer concepts first');
      return;
    }
    setShowAutoHighlights(!showAutoHighlights);
  };

  // Clear concepts and reset
  const clearConcepts = () => {
    setConceptsLoaded(false);
    setAutoMatches([]);
    setShowAutoHighlights(false);
    setLoadedFileName('');
    conceptMatcher.concepts.clear();
    conceptMatcher.isLoaded = false;
  };

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
    const updatedAnnotations = document.annotations.map(ann =>
      ann.id === updatedAnnotation.id ? updatedAnnotation : ann
    );
    setDocument({ ...document, annotations: updatedAnnotations });
    if (selectedAnnotation && selectedAnnotation.id === updatedAnnotation.id) {
      setSelectedAnnotation(updatedAnnotation);
    }
    updateAutoMatches();
  };

  const handleAnnotationAdd = (newAnnotation) => {
    if (!document) return;
    const updatedAnnotations = [...document.annotations, newAnnotation];
    setDocument({ ...document, annotations: updatedAnnotations });
    setSelectedAnnotation(newAnnotation);
    setSelectedTextData(null);
    setSelectedAutoMatch(null);
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
          {/* <div className="concept-status">
            {conceptsLoaded && (
              <span className="status-loaded">
                {conceptMatcher.getStats().totalConcepts} concepts loaded from {loadedFileName}
              </span>
            )}
          </div> */}
        </div>
        
        <div className="concept-controls-body">
          {!conceptsLoaded ? (
            <div className="concept-loader">
                <button 
                    onClick={handleAutoAnnotate} 
                    disabled={loadingConcepts}
                >
                    {loadingConcepts? 'Annotating...': <span><AutoFixHighIcon/> Auto-annotate</span>}
                </button>

            </div>
          ) : (
            <div className="concept-controls-actions">
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
                Clear Annotations
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

