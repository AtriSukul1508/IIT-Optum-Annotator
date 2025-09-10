import React from 'react';

const WordTooltip = ({ word, position }) => {
  const style = {
    position: 'fixed',
    left: position.x + 10,
    top: position.y - 40,
    backgroundColor: '#333',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 1000,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  };

  return (
    <div style={style}>
      <div>"{word.text}"</div>
      <div>Start: {word.start}, End: {word.end}</div>
    </div>
  );
};

export default WordTooltip;