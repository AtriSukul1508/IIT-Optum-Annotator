// src/components/DocumentViewer/AnnotationPanel.js - Updated with text selection
import React, { useState, useEffect } from 'react';
import { updateAnnotation, addAnnotation, deleteAnnotation } from '../../services/api';
import CloseIcon from '@mui/icons-material/Close';
import { fetchCuiFromUMLS } from '../../services/umlsAPI';
import BiotechIcon from '@mui/icons-material/Biotech';

const AnnotationPanel = ({ 
  annotations, 
  selectedAnnotation, 
  onAnnotationSelect, 
  onAnnotationUpdate,
  onAnnotationAdd,
  onAnnotationDelete,
  documentId,
  selectedTextData, // New prop for selected text
  updateSelectedTextData
}) => {
  const [editMode, setEditMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [searchError, setSearchError] = useState("");
  const [newAnnotationData, setNewAnnotationData] = useState({
    user: 'med_term_extract',
    cui: '',
    value: '',
    start: 0,
    end: 0,
    validated: false,
    correct: true,
    deleted: false,
    alternative: false,
    killed: false,
    manually_created: true,
    acc: 1,
    meta_anns: [{
      name: 'Status',
      value: 'Other',
      acc: 1,
      validated: false
    }]
  });
  const [loading, setLoading] = useState(false);

  // Auto-open add mode when text is selected
  useEffect(() => {
    if (selectedTextData && !editMode) {
      setAddMode(true);
      setEditMode(false);
      setNewAnnotationData({
        user: 'med_term_extract',
        cui: '',
        value: selectedTextData.value, // Auto-fill with selected text
        start: selectedTextData.start, // Auto-fill start index
        end: selectedTextData.end,     // Auto-fill end index
        validated: false,
        correct: true,
        deleted: false,
        alternative: false,
        killed: false,
        manually_created: true,
        acc: 1,
        meta_anns: [{
          name: 'Status',
          value: 'Other',
          acc: 1,
          validated: false
        }]
      });
    }
  }, [selectedTextData, editMode]);

  // Handle Edit Mode
  const handleEdit = () => {
    if (selectedAnnotation) {
      setEditData({ ...selectedAnnotation });
      setEditMode(true);
      setAddMode(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAnnotation) return;
    
    setLoading(true);
    try {
      const response = await updateAnnotation(documentId, selectedAnnotation.id, editData);
      onAnnotationUpdate(response.data);
      setEditMode(false);
      setEditData({});
    } catch (error) {
      console.error('Error updating annotation:', error);
      alert('Failed to update annotation: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };


  const resetNewAnnotationData = () => {
    setNewAnnotationData({
      user: 'med_term_extract',
      cui: '',
      value: '',
      start: 0,
      end: 0,
      validated: false,
      correct: true,
      deleted: false,
      alternative: false,
      killed: false,
      manually_created: true,
      acc: 1,
      meta_anns: [{
        name: 'Status',
        value: 'Other',
        acc: 1,
        validated: false
      }]
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    setAddMode(false);
    setEditData({});
    resetNewAnnotationData();
    updateSelectedTextData(null);
    setSearchError("");
  };

  // Handle Add New Mode
  const handleAddNew = () => {
    setAddMode(true);
    setEditMode(false);
    resetNewAnnotationData();
  };

  const handleAddSave = async () => {
    // Validation
    if (!newAnnotationData.value.trim()) {
      alert('Please enter a value for the annotation');
      return;
    }
    if (!newAnnotationData.cui.trim()) {
      alert('Please enter a CUI identifier');
      return;
    }
    if (newAnnotationData.start >= newAnnotationData.end) {
      alert('End index must be greater than start index');
      return;
    }

    // Check for overlapping annotations
    const hasOverlap = annotations.some(ann => 
      (newAnnotationData.start >= ann.start && newAnnotationData.start < ann.end) ||
      (newAnnotationData.end > ann.start && newAnnotationData.end <= ann.end) ||
      (newAnnotationData.start <= ann.start && newAnnotationData.end >= ann.end)
    );

    if (hasOverlap) {
      const proceed = window.confirm('This annotation overlaps with an existing annotation. Do you want to continue?');
      if (!proceed) return;
    }

    setLoading(true);
    try {
      const response = await addAnnotation(documentId, newAnnotationData);
      onAnnotationAdd(response.data);
      setAddMode(false);
      resetNewAnnotationData();
    } catch (error) {
      console.error('Error adding annotation:', error);
      alert('Failed to add annotation: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (annotationId = null) => {
    const targetId = annotationId || selectedAnnotation?.id;
    if (!targetId) return;
    
    if (!window.confirm('Are you sure you want to delete this annotation?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteAnnotation(documentId, targetId);
      onAnnotationDelete(targetId);
      if (selectedAnnotation && selectedAnnotation.id === targetId) {
        onAnnotationSelect(null); // Clear selection
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      alert('Failed to delete annotation: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Input change handlers
  const handleInputChange = (field, value) => {
    if (editMode) {
      setEditData(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (addMode) {
      setNewAnnotationData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleMetaAnnChange = (field, value) => {
    if (editMode) {
      setEditData(prev => ({
        ...prev,
        meta_anns: [
          {
            ...prev.meta_anns[0],
            [field]: value
          }
        ]
      }));
    } else if (addMode) {
      setNewAnnotationData(prev => ({
        ...prev,
        meta_anns: [
          {
            ...prev.meta_anns[0],
            [field]: value
          }
        ]
      }));
    }
  };

  const closeDetailsPanel = () => {
  onAnnotationSelect(null); // this clears the selection
  setEditMode(false);
  setAddMode(false);
  setEditData({});
};


  const currentData = editMode ? editData : addMode ? newAnnotationData : selectedAnnotation;

  return (
    <div className="annotation-panel">
      <div className="annotation-panel-header">
        <h3>Extracted entities ({annotations.length})</h3>
        <button 
          onClick={handleAddNew} 
          className="btn-primary"
          disabled={loading || addMode}
        >
          Add New
        </button>
      </div>
      
      <div className="annotations-list">
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className={`annotation-item ${
              selectedAnnotation && selectedAnnotation.id === annotation.id ? 'selected' : ''
            }`}
            onClick={() => !addMode && onAnnotationSelect(annotation)}
          >
            <div className="annotation-header">
              <div className="annotation-value">{annotation.value}</div>
              <button
                className="inline-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(annotation.id);
                }}
                title="Delete annotation"
                disabled={loading}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                </svg>
              </button>
            </div>
            <div className="annotation-meta">
              <span className="annotation-cui">{annotation.cui}</span>
              <span className={`annotation-status status-${annotation.meta_anns[0]?.value.toLowerCase() || 'other'}`}>
                {annotation.meta_anns[0]?.value || 'Other'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Form */}
      {addMode && (
        <div className="annotation-details">
          <div className="annotation-details-header">
            <h4>{selectedTextData ? 'Add selected entity into annotations' : 'Add new annotation'}</h4>
            <div className="annotation-actions">
              <button 
                onClick={handleAddSave} 
                className="btn-save"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={handleCancel} 
                className="btn-cancel"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>

          {selectedTextData && (
            <div className="selected-text-info">
              <strong>Selected Entity:</strong> "{selectedTextData.value}"
              <br />
              <small>Indices: {selectedTextData.start} - {selectedTextData.end}</small>
            </div>
          )}

          <div className="annotation-form">
            <div className="form-group">
              <label>Pretty Name *</label>
              <input
                type="text"
                value={currentData.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="Enter annotation text"
                disabled={selectedTextData?true:loading}
                autoFocus={selectedTextData ? false : true}
              />
            </div>

            <div className="form-group">
              <label>Identifier (CUI) *</label>
              <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                <input
                  type="text"
                  value={currentData.cui || ''}
                  onChange={(e) => {
                    setSearchError(""); // clear error when typing
                    handleInputChange('cui', e.target.value);
                  }}
                  placeholder="e.g., C0006142"
                  disabled={loading}
                  autoFocus={selectedTextData ? true : false}
                  style={{
                    width: "100%",
                    paddingRight: "40px" // make room for the icon inside
                  }}
                />

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setSearchError("");
                      const cui = await fetchCuiFromUMLS(currentData.value);
                      if (cui) {
                        handleInputChange("cui", cui);
                      } else {
                        setSearchError("No CUI found for this term.");
                      }
                    } catch (err) {
                      setSearchError(err.message || "Error fetching CUI.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !currentData.value}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: loading || !currentData.value ? "not-allowed" : "pointer",
                    color: "#d85959ff",
                    padding: 0,
                  }}
                  title="Search CUI in UMLS"
                >
                  <BiotechIcon />
                </button>
              </div>

              {/* Helper text */}
              <small style={{ display: "block", color: "#555", marginTop: "4px",fontStyle:'italic' }}>
                Click the icon to search the CUI for <span style={{color:"red",padding:0,background:"none"}}>{currentData.value}</span> in UMLS
              </small>

              {/* Inline error message */}
              {searchError && (
                <div style={{ color: "red", marginTop: "4px" }}>
                  {searchError}
                </div>
              )}
            </div>




            <div className="form-group">
              <label>User</label>
              <input
                type="text"
                value={currentData.user || ''}
                onChange={(e) => handleInputChange('user', e.target.value)}
                placeholder="med_term_extract"
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Index *</label>
                <input
                  type="number"
                  value={currentData.start || 0}
                  onChange={(e) => handleInputChange('start', parseInt(e.target.value) || 0)}
                  min="0"
                  disabled={selectedTextData?true:loading}
                />
              </div>

              <div className="form-group">
                <label>End Index *</label>
                <input
                  type="number"
                  value={currentData.end || 0}
                  onChange={(e) => handleInputChange('end', parseInt(e.target.value) || 0)}
                  min="0"
                  disabled={selectedTextData?true:loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confidence Score</label>
              <input
                type="number"
                value={currentData.acc || 1}
                onChange={(e) => handleInputChange('acc', parseFloat(e.target.value) || 1)}
                min="0"
                max="1"
                step="0.1"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={currentData.meta_anns?.[0]?.value || 'Other'}
                onChange={(e) => handleMetaAnnChange('value', e.target.value)}
                disabled={loading}
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={currentData.validated || false}
                    onChange={(e) => handleInputChange('validated', e.target.checked)}
                    disabled={loading}
                  />
                  Validated
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={currentData.correct !== false}
                    onChange={(e) => handleInputChange('correct', e.target.checked)}
                    disabled={loading}
                  />
                  Correct
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/View Form for Selected Annotation */}
      {selectedAnnotation && !addMode && (
        <div className="annotation-details">
          <div className="annotation-details-header">
            <h4>Entity Details</h4>
            <div className="annotation-actions">
              {!editMode ? (
                <span>
                <button 
                  onClick={handleEdit} 
                  className="btn-edit"
                  disabled={loading}
                >
                  Update
                </button>
                <CloseIcon onClick={closeDetailsPanel} style={{ cursor: 'pointer' }} />
                </span>
              ) : (
                <>
                  <button 
                    onClick={handleSave} 
                    className="btn-save"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleCancel} 
                    className="btn-cancel"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="annotation-form">
            <div className="form-group">
              <label>Pretty Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={currentData.value || ''}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  disabled={loading}
                />
              ) : (
                <span>{selectedAnnotation.value}</span>
              )}
            </div>

            <div className="form-group">
              <label>Identifier</label>
              {editMode ? (
                <input
                  type="text"
                  value={currentData.cui || ''}
                  onChange={(e) => handleInputChange('cui', e.target.value)}
                  disabled={loading}
                />
              ) : (
                <span>{selectedAnnotation.cui}</span>
              )}
            </div>

            <div className="form-group">
              <label>User</label>
              {editMode ? (
                <input
                  type="text"
                  value={currentData.user || ''}
                  onChange={(e) => handleInputChange('user', e.target.value)}
                  disabled={loading}
                />
              ) : (
                <span>{selectedAnnotation.user}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Index</label>
                {editMode ? (
                  <input
                    type="number"
                    value={currentData.start || 0}
                    onChange={(e) => handleInputChange('start', parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                ) : (
                  <span>{selectedAnnotation.start}</span>
                )}
              </div>

              <div className="form-group">
                <label>End Index</label>
                {editMode ? (
                  <input
                    type="number"
                    value={currentData.end || 0}
                    onChange={(e) => handleInputChange('end', parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                ) : (
                  <span>{selectedAnnotation.end}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>ID</label>
              <span>{selectedAnnotation.id}</span>
            </div>

            <div className="form-group">
              <label>Confidence Score</label>
              {editMode ? (
                <input
                  type="number"
                  value={currentData.acc || 1}
                  onChange={(e) => handleInputChange('acc', parseFloat(e.target.value) || 1)}
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={loading}
                />
              ) : (
                <span>{selectedAnnotation.acc || 1}</span>
              )}
            </div>

            <div className="form-group">
              <label>Status</label>
              {editMode ? (
                <select
                  value={currentData.meta_anns?.[0]?.value || 'Other'}
                  onChange={(e) => handleMetaAnnChange('value', e.target.value)}
                  disabled={loading}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <span className={`status-badge status-${selectedAnnotation.meta_anns?.[0]?.value.toLowerCase() || 'other'}`}>
                  {selectedAnnotation.meta_anns?.[0]?.value || 'Other'}
                </span>
              )}
            </div>

            {editMode && (
              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={currentData.validated || false}
                      onChange={(e) => handleInputChange('validated', e.target.checked)}
                      disabled={loading}
                    />
                    Validated
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={currentData.correct !== false}
                      onChange={(e) => handleInputChange('correct', e.target.checked)}
                      disabled={loading}
                    />
                    Correct
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* <div className="annotation-actions-bottom">
            <button 
              onClick={() => handleDelete()} 
              className="btn-danger"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;