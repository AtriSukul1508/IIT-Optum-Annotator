import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Document API functions
export const getAllDocuments = () => api.get('/documents');
export const getDocumentById = (id) => api.get(`/documents/${id}`);
export const createDocument = (data) => api.post('/documents', data);
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data);

// Annotation API functions
export const getAnnotations = (documentId) => api.get(`/annotations/document/${documentId}`);
export const addAnnotation = (documentId, data) => api.post(`/annotations/document/${documentId}`, data);
export const updateAnnotation = (documentId, annotationId, data) => 
  api.put(`/annotations/document/${documentId}/${annotationId}`, data);
export const deleteAnnotation = (documentId, annotationId) => 
  api.delete(`/annotations/document/${documentId}/${annotationId}`);

export default api;