import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDocuments } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';
import './DocumentList.css';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await getAllDocuments();
      setDocuments(response.data);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.textSnippet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="document-list-container">
      <div className="document-list-header">
        <h1>Discharge Summaries</h1>
        <div className="document-list-controls">
          <input
            type="text"
            placeholder="Search discharge summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {/* <button className="new-document-btn">New Document</button> */}
        </div>
      </div>

      <div className="documents-table">
        <table>
          <thead>
            <tr>
              <th>ICD Code</th>
              <th>Doc Name</th>
              <th>Discharge Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((document) => (
              <tr key={document.id} className="document-row">
                <td className="document-name">
                  <Link to={`/document/${document.id}`} className="document-link">
                    {document.textSnippet.substr(10,4)}
                  </Link>
                </td>
                <td className="document-id">{document.name}</td>
                <td className="document-snippet">
                  {document.textSnippet}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* <div className="pagination">
          <button className="pagination-btn">‹</button>
          <span className="pagination-info">Showing 1-5 of {documents.length}</span>
          <button className="pagination-btn">›</button>
        </div> */}
      </div>
    </div>
  );
};

export default DocumentList;