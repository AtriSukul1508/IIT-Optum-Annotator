import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export const getAllDocuments = () => {
  return api.get('/documents');
};

export const getAnnotatedDocuments = () => {
  return api.get('/documents/annotated');
};

export const getNotAnnotatedDocuments = () => {
  return api.get('/documents/not-annotated');
};

export const getDocumentStats = () => {
  return api.get('/documents/stats');
};

export const getDocumentById = (id) => {
  return api.get(`/documents/${id}`);
};

export const checkDocumentDuplicates = (data) => {
  return api.post('/documents/check-duplicates', { ...data, autoSave: true });
};

export const createDocumentsFromCSV = (bulkData) => {
  return api.post('/documents/bulk', bulkData);
};

export const downloadAnnotatedDocuments = (projectId = null) => {
  const url = projectId ? `/documents/download/annotated?projectId=${projectId}` : '/documents/download/annotated';
  return api.get(url, {
    responseType: 'blob', // Important for file downloads
  });
};

export const downloadDocumentsByIds = (documentIds) => {
  return api.post('/documents/download/by-ids', 
    { document_ids: documentIds },
    { responseType: 'blob' }
  );
};

export const updateDocument = (id, updateData) => {
  return api.put(`/documents/${id}`, updateData);
};

export const getAnnotations = (documentId) => {
  return api.get(`/annotations/document/${documentId}`);
};

export const getAnnotationStats = (documentId) => {
  return api.get(`/annotations/document/${documentId}/stats`);
};

export const addAnnotation = (documentId, annotationData) => {
  return api.post(`/annotations/document/${documentId}`, annotationData);
};

export const updateAnnotation = (documentId, annotationId, updateData) => {
  return api.put(`/annotations/document/${documentId}/${annotationId}`, updateData);
};


export const deleteAnnotation = (documentId, annotationId) => {
  return api.delete(`/annotations/document/${documentId}/${annotationId}`);
};


export const bulkDeleteAnnotations = (documentId, annotationIds) => {
  return api.delete(`/annotations/document/${documentId}/bulk`, {
    data: { annotation_ids: annotationIds }
  });
};


export const fetchCuiFromUMLS = async (searchTerm) => {
  try {
    const response = await api.get(`/umls/search`, {
      params: { term: searchTerm }
    });
    return response.data;
  } catch (error) {
    console.error('UMLS API Error:', error);
    throw new Error('Failed to search UMLS database');
  }
};


export const healthCheck = () => {
  return api.get('/health');
};


export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};



export const handleDownloadAnnotatedDocuments = async (projectId = null) => {
  try {
    const response = await downloadAnnotatedDocuments(projectId);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const projectSuffix = projectId ? `_project_${projectId}` : '';
    const filename = `annotated_documents${projectSuffix}_${timestamp}.json`;
    
    downloadFile(response.data, filename);
    
    return {
      success: true,
      message: `Downloaded ${filename} successfully`
    };
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(handleApiError(error));
  }
};


export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message || 'Unknown error';
    
    switch (status) {
      case 400:
        return `Bad Request: ${message}`;
      case 401:
        return 'Unauthorized: Please check your credentials';
      case 403:
        return 'Forbidden: You do not have permission to perform this action';
      case 404:
        return 'Not Found: The requested resource was not found';
      case 409:
        return `Conflict: ${message}`;
      case 500:
        return `Server Error: ${message}`;
      default:
        return `Error ${status}: ${message}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    return 'Network Error: Unable to connect to the server';
  } else {
    // Something else happened
    return `Error: ${error.message}`;
  }
};


export const retryApiCall = async (apiCall, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`API call failed, retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Export the axios instance for custom requests
export default api;
