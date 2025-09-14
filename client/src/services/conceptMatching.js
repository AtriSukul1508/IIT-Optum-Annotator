export class ConceptMatcher {
  constructor() {
    this.concepts = new Map(); // concept -> cui mapping
    this.isLoaded = false;
    this.maxLookAhead = 3;
    this.maxCombinationLength = 6;
  }

  loadConceptsFromCDB(cdbText) {
    try {
      const lines = cdbText.split('\n').filter(line => line.trim());
      this.concepts.clear();
      
      lines.forEach(line => {
        const parts = line.trim().split('&');
        if (parts.length >= 2) {
          const concept = parts[0].trim().toLowerCase();
          const cui = parts[1].trim();
          this.concepts.set(concept, cui);
        }
      });
      
      this.isLoaded = true;
      console.log(`Loaded ${this.concepts.size} concepts for enhanced matching`);
      return this.concepts.size;
    } catch (error) {
      console.error('Error loading concepts:', error);
      throw new Error('Failed to load concept database');
    }
  }

  findMatches(text, existingAnnotations = []) {
    if (!this.isLoaded || !text) return [];

    const matches = [];
    const existingRanges = existingAnnotations.map(ann => ({
      start: ann.start,
      end: ann.end
    }));

    // Sort concepts by length (longest first) for better matching
    const sortedConcepts = Array.from(this.concepts.keys())
      .sort((a, b) => b.length - a.length);

    for (const concept of sortedConcepts) {
      const cui = this.concepts.get(concept);
      const conceptMatches = this._findConceptInText(text, concept, cui);
      
      // Filter out overlapping matches
      for (const match of conceptMatches) {
        const overlaps = existingRanges.some(range => 
          (match.start >= range.start && match.start <= range.end) ||
          (match.end >= range.start && match.end <= range.end) ||
          (match.start <= range.start && match.end >= range.end)
        );

        const overlapWithMatches = matches.some(existing =>
          (match.start >= existing.start && match.start <= existing.end) ||
          (match.end >= existing.start && match.end <= existing.end) ||
          (match.start <= existing.start && match.end >= existing.end)
        );

        if (!overlaps && !overlapWithMatches) {
          matches.push(match);
        }
      }
      
      // Safety limit
      if (matches.length > 1000) break;
    }

    // Remove overlapping matches, keeping the longest ones
    const finalMatches = this._resolveOverlappingMatches(matches, existingRanges);
    
    console.log(`Found ${finalMatches.length} auto-matches (${matches.length} before overlap removal)`);
    return finalMatches.sort((a, b) => a.start - b.start);
  }

  _findConceptInText(text, concept, cui) {
    const matches = [];
    const conceptWords = concept.split(/\s+/);
    
    if (conceptWords.length === 1) {
      // Single word matching (existing logic)
      return this._findSingleWordMatches(text, concept, cui);
    } else {
      // Multi-word matching with whitespace normalization
      return this._findMultiWordMatches(text, conceptWords, concept, cui);
    }
  }

  _findSingleWordMatches(text, concept, cui) {
    const matches = [];
    const textLower = text.toLowerCase();
    const conceptLower = concept.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = textLower.indexOf(conceptLower, startIndex);
      if (index === -1) break;

      const endIndex = index + concept.length;

      if (this.isWordBoundary(text, index, concept.length)) {
        const actualText = text.substring(index, index + concept.length);
        
        matches.push({
          id: `auto_${Date.now()}_${matches.length}_${Math.random().toString(36).substr(2, 9)}`,
          concept: concept,
          cui: cui,
          value: actualText,
          start: index,
          end: endIndex,
          confidence: this.calculateConfidence(concept, actualText),
          wordCount: 1,
          isAutoDetected: true,
          matchType: 'single'
        });
      }

      startIndex = index + 1;
    }

    return matches;
  }

  _findMultiWordMatches(text, conceptWords, originalConcept, cui) {
    const matches = [];
    const textLower = text.toLowerCase();
    
    // Start by finding the first word
    const firstWord = conceptWords[0];
    let searchStart = 0;

    while (true) {
      const firstWordIndex = textLower.indexOf(firstWord, searchStart);
      if (firstWordIndex === -1) break;

      // Check if first word has proper word boundary
      if (!this.isWordBoundary(text, firstWordIndex, firstWord.length)) {
        searchStart = firstWordIndex + 1;
        continue;
      }

      // Try to match the complete phrase starting from this position
      const phraseMatch = this._matchPhraseFromPosition(text, conceptWords, firstWordIndex);
      
      if (phraseMatch) {
        matches.push({
          id: `auto_${Date.now()}_${matches.length}_${Math.random().toString(36).substr(2, 9)}`,
          concept: originalConcept,
          cui: cui,
          value: phraseMatch.actualText,
          start: phraseMatch.start,
          end: phraseMatch.end,
          confidence: this.calculateConfidence(originalConcept, phraseMatch.actualText),
          wordCount: conceptWords.length,
          isAutoDetected: true,
          matchType: 'contextual'
        });
      }

      searchStart = firstWordIndex + 1;
    }

    return matches;
  }

  _matchPhraseFromPosition(text, conceptWords, startPos) {
    const textLower = text.toLowerCase();
    let currentPos = startPos;
    let matchEnd = startPos + conceptWords[0].length - 1;
    
    // Move past the first word
    currentPos = startPos + conceptWords[0].length;

    // Try to match remaining words
    for (let i = 1; i < conceptWords.length; i++) {
      const word = conceptWords[i];
      
      // Skip whitespace (including newlines) with reasonable limit
      let whitespaceCount = 0;
      while (currentPos < text.length && 
             /\s/.test(text[currentPos]) && 
             whitespaceCount < 50) { // Allow reasonable amount of whitespace
        currentPos++;
        whitespaceCount++;
      }
      
      // Check if we've gone too far or hit end of text
      if (currentPos >= text.length || whitespaceCount >= 50) {
        return null;
      }
      
      // Check if the word matches at current position
      const wordAtPos = textLower.substring(currentPos, currentPos + word.length);
      if (wordAtPos !== word) {
        return null;
      }
      
      // For the last word, check word boundary
      if (i === conceptWords.length - 1) {
        if (!this.isWordBoundary(text, currentPos, word.length)) {
          return null;
        }
      }
      
      matchEnd = currentPos + word.length;
      currentPos = matchEnd + 1;
    }
    
    return {
      start: startPos,
      end: matchEnd,
      actualText: text.substring(startPos, matchEnd + 1)
    };
  }

  _resolveOverlappingMatches(potentialMatches, existingRanges) {
    // Remove matches that overlap with existing annotations
    let filteredMatches = potentialMatches.filter(match => {
      return !existingRanges.some(range => 
        (match.start >= range.start && match.start <= range.end) ||
        (match.end >= range.start && match.end <= range.end) ||
        (match.start <= range.start && match.end >= range.end)
      );
    });

    // Sort by priority: longer matches first, then by confidence, then by position
    filteredMatches.sort((a, b) => {
      if (a.wordCount !== b.wordCount) return b.wordCount - a.wordCount;
      if (Math.abs(a.confidence - b.confidence) > 0.1) return b.confidence - a.confidence;
      return a.start - b.start;
    });

    // Remove overlapping matches, keeping the best ones
    const finalMatches = [];
    for (const match of filteredMatches) {
      const hasOverlap = finalMatches.some(existing => 
        (match.start >= existing.start && match.start <= existing.end) ||
        (match.end >= existing.start && match.end <= existing.end) ||
        (match.start <= existing.start && match.end >= existing.end)
      );
      
      if (!hasOverlap) {
        finalMatches.push(match);
      }
      
      // Safety limit
      if (finalMatches.length >= 1500) break;
    }

    return finalMatches;
  }

  isWordBoundary(text, index, length) {
    const before = index > 0 ? text[index - 1] : ' ';
    const after = index + length < text.length ? text[index + length] : ' ';
    
    const wordBoundaryChars = /[\s\.,;:!?\-\(\)\[\]"'\/\\]/;
    return wordBoundaryChars.test(before) && wordBoundaryChars.test(after);
  }

  calculateConfidence(concept, actualText) {
    const conceptLower = concept.toLowerCase();
    const actualTextLower = actualText.toLowerCase();
    
    // Normalize whitespace for comparison
    const normalizedConcept = conceptLower.replace(/\s+/g, ' ').trim();
    const normalizedActual = actualTextLower.replace(/\s+/g, ' ').trim();
    
    if (normalizedConcept === normalizedActual) {
      return 1.0;
    }
    
    const maxLength = Math.max(normalizedConcept.length, normalizedActual.length);
    const distance = this.levenshteinDistance(normalizedConcept, normalizedActual);
    const similarity = 1 - (distance / maxLength);
    
    return Math.max(0.7, similarity);
  }

  levenshteinDistance(str1, str2) {
    if (str1 === str2) return 0;
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i-1] === str2[j-1]) {
          matrix[j][i] = matrix[j-1][i-1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j-1][i-1] + 1,
            matrix[j][i-1] + 1,
            matrix[j-1][i] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  getSuggestions(text, limit = 10) {
    if (!this.isLoaded || !text) return [];

    const searchText = text.toLowerCase();
    const suggestions = [];

    for (const [concept, cui] of this.concepts) {
      if (concept.includes(searchText) || searchText.includes(concept)) {
        suggestions.push({
          concept,
          cui,
          relevance: this._calculateRelevance(searchText, concept)
        });
      }
      
      if (suggestions.length >= limit) break;
    }

    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }

  _calculateRelevance(searchText, concept) {
    const searchLower = searchText.toLowerCase();
    const conceptLower = concept.toLowerCase();
    
    if (conceptLower === searchLower) return 1.0;
    if (conceptLower.startsWith(searchLower)) return 0.9;
    if (conceptLower.includes(searchLower)) return 0.7;
    if (searchLower.includes(conceptLower)) return 0.6;
    return 0.5;
  }

  getStats() {
    return {
      totalConcepts: this.concepts.size,
      isLoaded: this.isLoaded,
      maxLookAhead: this.maxLookAhead,
      maxCombinationLength: this.maxCombinationLength
    };
  }

  findConceptOccurrences(text, concept) {
    if (!text || !concept) return [];
    
    const conceptWords = concept.toLowerCase().split(/\s+/);
    
    if (conceptWords.length === 1) {
      // Single word search
      return this._findSingleWordOccurrences(text, concept);
    } else {
      // Multi-word search
      return this._findMultiWordOccurrences(text, conceptWords, concept);
    }
  }

  _findSingleWordOccurrences(text, concept) {
    const occurrences = [];
    const textLower = text.toLowerCase();
    const conceptLower = concept.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = textLower.indexOf(conceptLower, startIndex);
      if (index === -1) break;

      const endIndex = index + concept.length;
      const actualText = text.substring(index, index + concept.length);
      
      occurrences.push({
        start: index,
        end: endIndex,
        text: actualText,
        isWordBoundary: this.isWordBoundary(text, index, concept.length),
        wordCount: 1
      });

      startIndex = index + 1;
    }

    return occurrences;
  }

  _findMultiWordOccurrences(text, conceptWords, originalConcept) {
    const occurrences = [];
    const textLower = text.toLowerCase();
    const firstWord = conceptWords[0];
    let searchStart = 0;

    while (true) {
      const firstWordIndex = textLower.indexOf(firstWord, searchStart);
      if (firstWordIndex === -1) break;

      const phraseMatch = this._matchPhraseFromPosition(text, conceptWords, firstWordIndex);
      
      if (phraseMatch) {
        occurrences.push({
          start: phraseMatch.start,
          end: phraseMatch.end,
          text: phraseMatch.actualText,
          isWordBoundary: this.isWordBoundary(text, phraseMatch.start, phraseMatch.end - phraseMatch.start + 1),
          wordCount: conceptWords.length
        });
      }

      searchStart = firstWordIndex + 1;
    }

    return occurrences;
  }
}

// Create singleton instance
export const conceptMatcher = new ConceptMatcher();

export const loadBreastCancerConceptsFromFile = async (file) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
      throw new Error('Please upload a .txt file');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 10MB');
    }

    const text = await file.text();
    const count = conceptMatcher.loadConceptsFromCDB(text);
    
    return {
      success: true,
      conceptCount: count,
      fileName: file.name,
      fileSize: file.size,
      message: `Successfully loaded ${count} concepts with newline-aware matching from ${file.name}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export const loadBreastCancerConcepts = async (cdbText) => {
  try {
    const count = conceptMatcher.loadConceptsFromCDB(cdbText);
    return {
      success: true,
      conceptCount: count,
      message: `Successfully loaded ${count} concepts with newline-aware matching`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
