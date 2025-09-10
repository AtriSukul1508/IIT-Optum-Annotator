// src/components/DocumentViewer/AnnotatedText.js
import React, { useState, useRef, useEffect } from 'react';
import WordTooltip from './WordTooltip';

const AnnotatedText = ({ 
  text, 
  annotations, 
  onAnnotationSelect, 
  selectedAnnotation,
  onTextSelected,
  onDeleteAnnotation 
}) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [hoveredAnnotationPosition, setHoveredAnnotationPosition] = useState({ x: 0, y: 0 });
  const textContainerRef = useRef(null);

  // Sort annotations by start position
  const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);

  // Handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const container = textContainerRef.current;
      
      if (container && container.contains(range.commonAncestorContainer)) {
        // Calculate character positions in the original text
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(container);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = beforeRange.toString().length;
        const endOffset = startOffset + range.toString().length;
        
        // Get the position of the selection for the floating button
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        setSelection({
          text: range.toString(),
          start: startOffset,
          end: endOffset,
          rect: {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 10
          }
        });
      }
    }
  };

  // Clear selection when clicking elsewhere
  const handleMouseDown = (e) => {
    // Don't clear selection if clicking on the add button
    if (e.target.closest('.floating-add-button')) {
      return;
    }
    setSelection(null);
    window.getSelection().removeAllRanges();
  };

  // Handle add new annotation from selection
  const handleAddFromSelection = () => {
    if (selection && onTextSelected) {
      onTextSelected({
        value: selection.text,
        start: selection.start,
        end: selection.end
      });
      setSelection(null);
      window.getSelection().removeAllRanges();
    }
  };

  // Handle annotation hover for delete button
  const handleAnnotationMouseEnter = (annotation, event) => {
    const rect = event.target.getBoundingClientRect();
    const container = textContainerRef.current.getBoundingClientRect();
    
    setHoveredAnnotation(annotation);
    setHoveredAnnotationPosition({
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top - 10
    });
  };

  const handleAnnotationMouseLeave = () => {
    setHoveredAnnotation(null);
  };

  // Handle delete annotation
  const handleDeleteAnnotation = (annotationId) => {
    if (onDeleteAnnotation) {
      onDeleteAnnotation(annotationId);
    }
    setHoveredAnnotation(null);
  };

  // Create highlighted text with annotations
  const createHighlightedText = () => {
    let result = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, index) => {
      // Add text before annotation
      if (annotation.start > lastIndex) {
        const beforeText = text.substring(lastIndex, annotation.start);
        result.push(
          <span key={`before-${index}`} className="regular-text">
            {renderTextWithWordHover(beforeText, lastIndex)}
          </span>
        );
      }

      // Add highlighted annotation
      const annotationText = text.substring(annotation.start, annotation.end+1);
      const isSelected = selectedAnnotation && selectedAnnotation.id === annotation.id;
      
      result.push(
        <span
          key={`annotation-${annotation.id}`}
          className={`highlighted-text ${isSelected ? 'selected' : ''} status-${annotation.meta_anns[0]?.value.toLowerCase() || 'other'}`}
          onClick={() => onAnnotationSelect(annotation)}
          onMouseEnter={(e) => handleAnnotationMouseEnter(annotation, e)}
          onMouseLeave={handleAnnotationMouseLeave}
          title={`${annotation.value} (${annotation.cui})`}
        >
          {annotationText}
        </span>
      );

      lastIndex = annotation.end+1;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      result.push(
        <span key="remaining" className="regular-text">
          {renderTextWithWordHover(remainingText, lastIndex)}
        </span>
      );
    }

    return result;
  };

  // Render text with word hover functionality
  const renderTextWithWordHover = (textSegment, startOffset) => {
    const words = textSegment.split(/(\s+)/);
    let currentIndex = startOffset;

    return words.map((word, index) => {
      const wordStart = currentIndex;
      const wordEnd = currentIndex + word.length;
      currentIndex += word.length;

      if (word.trim() === '') {
        return word; // Return whitespace as is
      }

      return (
        <span
          key={`word-${wordStart}-${index}`}
          className="hoverable-word"
          onMouseEnter={(e) => {
            setHoveredWord({
              text: word.trim(),
              start: wordStart,
              end: wordEnd,
            });
            setMousePosition({ x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => setHoveredWord(null)}
        >
          {word}
        </span>
      );
    });
  };

  // Clean up selection on unmount
  useEffect(() => {
    return () => {
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    };
  }, []);

  return (
    <div 
      className="annotated-text"
      ref={textContainerRef}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      {createHighlightedText()}
      
      {/* Floating Add Button for Text Selection */}
      {selection && (
        <div 
          className="floating-add-button"
          style={{
            position: 'absolute',
            left: selection.rect.x,
            top: selection.rect.y,
            transform: 'translateX(-50%)',
            zIndex: 1000
          }}
        >
          <button
            onClick={handleAddFromSelection}
            className="add-annotation-btn"
            title="Add annotation for selected text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
          </button>
        </div>
      )}


      {/* Word Hover Tooltip */}
      {hoveredWord && (
        <WordTooltip
          word={hoveredWord}
          position={mousePosition}
        />
      )}
    </div>
  );
};

export default AnnotatedText;