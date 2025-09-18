import React, { useState, useRef, useEffect } from 'react';
import WordTooltip from './WordTooltip';

const AnnotatedText = ({ 
  text, 
  annotations, 
  onAnnotationSelect, 
  selectedAnnotation,
  onTextSelected,
  onDeleteAnnotation,
  // New props for auto-highlighting
  autoMatches = [],
  showAutoHighlights = true,
  onAutoMatchSelect
}) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [hoveredAnnotationPosition, setHoveredAnnotationPosition] = useState({ x: 0, y: 0 });
  const [hoveredAutoMatch, setHoveredAutoMatch] = useState(null);
  const [hoveredAutoMatchPosition, setHoveredAutoMatchPosition] = useState({ x: 0, y: 0 });
  const textContainerRef = useRef(null);

  // Combine and sort all highlights (annotations + auto-matches)
  const getAllHighlights = () => {
    const highlights = [...annotations];
    
    if (showAutoHighlights) {
      // Only add auto-matches that don't overlap with existing annotations
      autoMatches.forEach(match => {
        const overlaps = annotations.some(ann => 
          (match.start >= ann.start && match.start <= ann.end) ||
          (match.end >= ann.start && match.end <= ann.end) ||
          (match.start <= ann.start && match.end >= ann.end)
        );
        
        if (!overlaps) {
          highlights.push(match);
        }
      });
    }
    
    return highlights.sort((a, b) => a.start - b.start);
  };

  const sortedHighlights = getAllHighlights();

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

  
  const handleMouseDown = (e) => {
    
    if (e.target.closest('.floating-add-button') || e.target.closest('.auto-match-tooltip')) {
      return;
    }

    setSelection(null);
    window.getSelection().removeAllRanges();
  };

  
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
    if (annotation.isAutoDetected) return; // Don't show delete for auto-matches
    
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

  // Handle auto-match hover for add button
  const handleAutoMatchMouseEnter = (autoMatch, event) => {
    const rect = event.target.getBoundingClientRect();
    const container = textContainerRef.current.getBoundingClientRect();
    
    setHoveredAutoMatch(autoMatch);
    setHoveredAutoMatchPosition({
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top - 10
    });
  };

  const handleAutoMatchMouseLeave = () => {
    setHoveredAutoMatch(null);
  };

  // Handle delete annotation
  const handleDeleteAnnotation = (annotationId) => {
    if (onDeleteAnnotation) {
      onDeleteAnnotation(annotationId);
    }
    setHoveredAnnotation(null);
  };

  // Handle adding auto-match as annotation
  const handleAddAutoMatch = (autoMatch) => {
    if (onTextSelected) {
      onTextSelected({
        value: autoMatch.value,
        start: autoMatch.start,
        end: autoMatch.end + 1, // Adjust for annotation format
        suggestedCui: autoMatch.cui,
        suggestedConcept: autoMatch.concept
      });
    }
    setHoveredAutoMatch(null);
  };

  // Create highlighted text with annotations and auto-matches
  const createHighlightedText = () => {
    let result = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        const beforeText = text.substring(lastIndex, highlight.start);
        result.push(
          <span key={`before-${index}`} className="regular-text">
            {renderTextWithWordHover(beforeText, lastIndex)}
          </span>
        );
      }

      const highlightText = text.substring(highlight.start, highlight.end);
      const isSelected = selectedAnnotation && selectedAnnotation.id === highlight.id;
      
      if (highlight.isAutoDetected) {

        const confidenceLevel = Math.round(highlight.confidence * 10);
        result.push(
          <span
            key={`auto-${highlight.id}`}
            className={`auto-highlighted-text confidence-${confidenceLevel} ${isSelected? 'auto-selected':''}`}
            onClick={() => onAutoMatchSelect && onAutoMatchSelect(highlight)}
            onMouseEnter={(e) => handleAutoMatchMouseEnter(highlight, e)}
            onMouseLeave={handleAutoMatchMouseLeave}
            title={`Auto-detected: ${highlight.concept} (${highlight.cui}) - Confidence: ${Math.round(highlight.confidence * 100)}%`}
            style={{
              borderRadius: '3px',
              padding: '1px 3px',
              cursor: 'pointer',
              margin: '0 1px'
            }}
          >
            {highlightText}
          </span>
        );
      } else {
        // Manual annotation - Add safe null checks
        const metaAnns = highlight.meta_anns || [];
        const firstMetaAnn = metaAnns.length > 0 ? metaAnns[0] : null;
        const metaAnnValue = firstMetaAnn ? firstMetaAnn.value : 'Other';
                  
        result.push(
          <span
            key={`annotation-${highlight.id}`}
            className={`highlighted-text ${isSelected ? 'selected' : ''} status-${metaAnnValue.toLowerCase()}`}
            onClick={() => onAnnotationSelect(highlight)}
            // onMouseEnter={(e) => handleAnnotationMouseEnter(highlight, e)}
            // onMouseLeave={handleAnnotationMouseLeave}
            title={`${highlight.value} (${highlight.cui})`}
          >
            {highlightText}
          </span>
        );
      }

      lastIndex = highlight.end;
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

      {/* Word Hover Tooltip - commented out as in original */}
      {/* {hoveredWord && (
        <WordTooltip
          word={hoveredWord}
          position={mousePosition}
        />
      )} */}
    </div>
  );
};

export default AnnotatedText;
