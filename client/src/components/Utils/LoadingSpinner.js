import React from 'react';

const LoadingSpinner = () => {
  const spinnerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px'
  };

  const dotStyle = {
    width: '12px',
    height: '12px',
    backgroundColor: '#4a90e2',
    borderRadius: '50%',
    margin: '0 4px',
    animation: 'loading-pulse 1.4s ease-in-out infinite both'
  };

  const keyframes = `
    @keyframes loading-pulse {
      0%, 80%, 100% {
        transform: scale(0);
      } 40% {
        transform: scale(1);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={spinnerStyle}>
        <div style={{ ...dotStyle, animationDelay: '-0.32s' }}></div>
        <div style={{ ...dotStyle, animationDelay: '-0.16s' }}></div>
        <div style={dotStyle}></div>
      </div>
    </>
  );
};

export default LoadingSpinner;