import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocumentById } from '../../services/api';
import AnnotatedText from './AnnotatedText';
import AnnotationPanel from './AnnotationPanel';
import LoadingSpinner from '../Utils/LoadingSpinner';
import ErrorMessage from '../Utils/ErrorMessage';
import './DocumentViewer.css';

const DocumentViewer = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [project, setProject] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [selectedTextData, setSelectedTextData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocument();
  }, [id]);

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

  const handleAnnotationSelect = (annotation) => {
    setSelectedAnnotation(annotation);
    // Clear text selection when selecting an annotation
    setSelectedTextData(null);
  };

  const handleTextSelected = (textData) => {
    setSelectedTextData(textData);
    // Clear annotation selection when selecting text
    setSelectedAnnotation(null);
  };

  const handleAnnotationUpdate = (updatedAnnotation) => {
    if (!document) return;
    
    const updatedAnnotations = document.annotations.map(ann =>
      ann.id === updatedAnnotation.id ? updatedAnnotation : ann
    );
    
    setDocument({
      ...document,
      annotations: updatedAnnotations
    });

    // Update selected annotation if it's the one being updated
    if (selectedAnnotation && selectedAnnotation.id === updatedAnnotation.id) {
      setSelectedAnnotation(updatedAnnotation);
    }
  };

  const handleAnnotationAdd = (newAnnotation) => {
    if (!document) return;
    
    const updatedAnnotations = [...document.annotations, newAnnotation];
    
    setDocument({
      ...document,
      annotations: updatedAnnotations
    });

    // Select the newly added annotation and clear text selection
    setSelectedAnnotation(newAnnotation);
    setSelectedTextData(null);
  };

  const handleAnnotationDelete = (deletedAnnotationId) => {
    if (!document) return;
    
    const updatedAnnotations = document.annotations.filter(
      ann => ann.id !== deletedAnnotationId
    );
    
    setDocument({
      ...document,
      annotations: updatedAnnotations
    });

    // Clear selection if the deleted annotation was selected
    if (selectedAnnotation && selectedAnnotation.id === deletedAnnotationId) {
      setSelectedAnnotation(null);
    }
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
          <span>Number of Entities annotated: {document.annotations.length}</span>
        </div>
      </div>

      <div className="document-viewer-content">
        <div className="document-text-container">
          <div className="document-text-header">
            <h2>Discharge Summary Text</h2>
            <div className="text-instructions">
              <small>
                You can select text to create a new annotation
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
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
