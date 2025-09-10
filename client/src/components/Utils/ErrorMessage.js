import React from 'react';

const ErrorMessage = ({ message }) => {
  const errorStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    color: '#dc3545',
    fontSize: '16px',
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #f5c6cb',
    borderRadius: '8px',
    margin: '20px 0'
  };

  return (
    <div style={errorStyle}>
      {message || 'An error occurred'}
    </div>
  );
};

export default ErrorMessage;