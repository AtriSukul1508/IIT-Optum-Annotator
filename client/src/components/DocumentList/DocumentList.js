import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getAllDocuments, 
  getAnnotatedDocuments, 
  getNotAnnotatedDocuments,
  getDocumentStats,
  handleDownloadAnnotatedDocuments
} from '../../services/api';
import CSVUpload from './CSVUpload';
import LoadingSpinner from '../Utils/LoadingSpinner';
import ErrorMessage from '../Utils/ErrorMessage';
import './DocumentList.css';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';


const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('annotated');
  const [stats, setStats] = useState({
    total_documents: 0,
    annotated_documents: 0,
    not_annotated_documents: 0,
  });
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [activeTab]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let response;
      
      switch(activeTab) {
        case 'annotated':
          response = await getAnnotatedDocuments();
          break;
        case 'not-annotated':
          response = await getNotAnnotatedDocuments();
          break;
        default:
          response = await getAllDocuments();
      }
      
      setDocuments(response.data);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getDocumentStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleUploadSuccess = async (result) => {
    // alert(`Successfully uploaded ${result.uploaded} documents out of ${result.total}`);
    setShowCSVUpload(false);
    await fetchDocuments();
    await fetchStats();
  };

  const handleUploadError = (error) => {
    alert('CSV Upload Error: ' + error);
    console.error('CSV Upload Error:', error);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  const handleDownload = async () => {
    if (activeTab !== 'annotated') {
      alert('Download is only available for annotated documents. Please switch to the "Annotated Documents" tab.');
      return;
    }

    try {
      setDownloading(true);
      const result = await handleDownloadAnnotatedDocuments();

      
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.textSnippet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && documents.length === 0) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="document-list-container">
      <div className="document-list-header">
        <div className="stats-dashboard">
          <div className="stat-item">
            <span className="stat-number">{stats.total_documents}</span>
            <span className="stat-label">Total Discharge Summaries</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.annotated_documents}</span>
            <span className="stat-label">Annotated</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.not_annotated_documents}</span>
            <span className="stat-label">Not Annotated</span>
          </div>
        </div>

        <div className="document-list-controls">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <button 
            className="upload-btn"
            onClick={() => setShowCSVUpload(true)}
            disabled={loading}
          >
            <UploadIcon/>
            Upload CSV
          </button>

          <button 
            className={`download-btn ${activeTab !== 'annotated' ? 'disabled' : ''}`}
            onClick={handleDownload}
            disabled={loading || downloading || activeTab !== 'annotated'}
            title={activeTab !== 'annotated' ? 'Switch to Annotated Documents tab to download' : 'Download all annotated documents as JSON'}
          >
            <DownloadIcon />
            {downloading ? 'Downloading...' : 'Download JSON'}
          </button>
        </div>
      </div>

      {showCSVUpload && (
        <div className="csv-modal-overlay">
          <div className="csv-modal">
            <div className="csv-modal-header">
              <h3>Upload CSV Documents</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowCSVUpload(false)}
              >
                <CloseIcon/>
              </button>
            </div>
            <div className="csv-modal-content">
              <CSVUpload 
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          </div>
        </div>
      )}

      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'annotated' ? 'active' : ''}`}
          onClick={() => handleTabChange('annotated')}
        >
          Annotated Discharge Summaries ({stats.annotated_documents})
        </button>
        <button 
          className={`tab-button ${activeTab === 'not-annotated' ? 'active' : ''}`}
          onClick={() => handleTabChange('not-annotated')}
        >
          Not Annotated Discharge Summaries ({stats.not_annotated_documents})
        </button>
      </div>

      <div className="documents-table">
        {loading && <div className="loading-overlay">Loading...</div>}
        
        <table>
          <thead>
            <tr>
              <th>ICD Code</th>
              <th>Document Name</th>
              <th>Text Preview</th>
              {activeTab === 'annotated' && (
                <>
                  <th>Annotations</th>
                </>
              )}
              <th>Last Modified</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'annotated' ? 7 : 5} className="no-documents">
                  {searchTerm ? 
                    `No documents found matching "${searchTerm}"` : 
                    `No ${activeTab.replace('-', ' ')} documents found`
                  }
                </td>
              </tr>
            ) : (
              filteredDocuments.map((document) => (
                <tr key={document.id} className="document-row">
                  <td className="document-icd">
                    <Link to={`/document/${document.id}`} className="document-link">
                      {document.textSnippet.substring(10, 14)}
                    </Link>
                  </td>
                  <td className="document-name">{document.name}</td>
                  <td className="document-snippet">
                    {document.textSnippet}
                  </td>
                  {activeTab === 'annotated' && (
                    <>
                      <td className="annotation-count">
                        <span className="count-badge">{document.annotation_count || 0}</span>
                      </td>
                    </>
                  )}
                  <td className="last-modified">
                    {formatDate(document.last_modified)}
                  </td>
                  <td className="document-status">
                    <span 
                      className={`status-badge ${document.is_annotated ? 'annotated' : 'not-annotated'}`}
                    >
                      {document.is_annotated ? 'Annotated' : 'Not Annotated'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredDocuments.length > 0 && (
          <div className="results-summary">
            Showing {filteredDocuments.length} of {documents.length} {activeTab.replace('-', ' ')} documents
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentList;