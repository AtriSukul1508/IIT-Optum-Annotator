import React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const DeleteConfirmationDialog = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "Delete Annotation", 
  message = "Are you sure you want to delete this annotation?",
  annotationValue = "",
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="delete-dialog-overlay">
      <div className="delete-dialog">
        <div className="delete-dialog-header">
          <div className="delete-dialog-icon">
            <DeleteIcon />
          </div>
          <h3>{title}</h3>
          <button 
            className="delete-dialog-close"
            onClick={onCancel}
            disabled={loading}
          >
            <CloseIcon />
          </button>
        </div>
        
        <div className="delete-dialog-content">
          <p>{message}</p>
          {annotationValue && (
            <div className="delete-dialog-annotation">
              <strong>Annotation:</strong> "{annotationValue}"
            </div>
          )}
        </div>
        
        <div className="delete-dialog-actions">
          <button 
            className="btn-cancel-dialog" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-delete-confirm" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Deleting...
              </>
            ) : (
              <>
                <DeleteIcon fontSize="small" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;