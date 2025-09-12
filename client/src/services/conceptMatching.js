export class ConceptMatcher {
  constructor() {
    this.concepts = new Map(); // concept -> cui mapping
    this.isLoaded = false;
  }

  loadConceptsFromCDB(cdbText) {
    try {
      const lines = cdbText.split('\n').filter(line => line.trim());
      this.concepts.clear();
      
      lines.forEach(line => {
        const parts = line.trim().split('&');
        if (parts.length >= 2) {
          const concept = parts[0].trim().toLowerCase(); // Store in lowercase for case-insensitive matching
          const cui = parts[1].trim();
          this.concepts.set(concept, cui);
        }
      });
      
      this.isLoaded = true;
      console.log(`Loaded ${this.concepts.size} breast cancer concepts`);
      return this.concepts.size;
    } catch (error) {
      console.error('Error loading concepts:', error);
      throw new Error('Failed to load concept database');
    }
  }

  findMatches(text, existingAnnotations = []) {
    if (!this.isLoaded || !text) return [];

    const matches = [];
    const textLower = text.toLowerCase();
    const existingRanges = existingAnnotations.map(ann => ({
      start: ann.start,
      end: ann.end
    }));

    // Sort concepts by length (longest first) for better matching
    const sortedConcepts = Array.from(this.concepts.keys())
      .sort((a, b) => b.length - a.length);

    sortedConcepts.forEach(concept => {
      const cui = this.concepts.get(concept);
      let startIndex = 0;

      // Find ALL occurrences of this concept in the text
      while (true) {
        const index = textLower.indexOf(concept.toLowerCase(), startIndex);
        if (index === -1) break;

        const endIndex = index + concept.length - 1;

        // Check if this match overlaps with existing annotations
        const overlaps = existingRanges.some(range => 
          (index >= range.start && index <= range.end) ||
          (endIndex >= range.start && endIndex <= range.end) ||
          (index <= range.start && endIndex >= range.end)
        );

        // Check if this position overlaps with already found matches
        const overlapWithMatches = matches.some(match =>
          (index >= match.start && index <= match.end) ||
          (endIndex >= match.start && endIndex <= match.end) ||
          (index <= match.start && endIndex >= match.end)
        );

        // Only add if it's a word boundary match and doesn't overlap
        if (!overlaps && !overlapWithMatches && this.isWordBoundary(text, index, concept.length)) {
          // Get the actual text from the original document (preserves original case)
          const actualText = text.substring(index, index + concept.length);
          
          matches.push({
            id: `auto_${Date.now()}_${matches.length}`, // More unique ID for auto-matches
            concept: concept,
            cui: cui,
            value: actualText, // Use actual text from document (preserves original case)
            start: index,
            end: endIndex,
            confidence: this.calculateConfidence(concept, actualText),
            isAutoDetected: true
          });
        }

        // Move to next character to find overlapping matches
        startIndex = index + 1;
      }
    });

    // Sort matches by start position and remove any remaining overlaps
    const sortedMatches = matches.sort((a, b) => a.start - b.start);
    
    // Remove overlapping matches (keep the longest/highest confidence ones)
    const finalMatches = [];
    for (const match of sortedMatches) {
      const hasOverlap = finalMatches.some(existing => 
        (match.start >= existing.start && match.start <= existing.end) ||
        (match.end >= existing.start && match.end <= existing.end) ||
        (match.start <= existing.start && match.end >= existing.end)
      );
      
      if (!hasOverlap) {
        finalMatches.push(match);
      }
    }

    console.log(`Found ${finalMatches.length} auto-matches (${matches.length} before overlap removal)`);
    return finalMatches;
  }

  isWordBoundary(text, index, length) {
    const before = index > 0 ? text[index - 1] : ' ';
    const after = index + length < text.length ? text[index + length] : ' ';
    
    // Consider word boundaries: space, punctuation, start/end of text
    const wordBoundaryChars = /[\s\.,;:!?\-\(\)\[\]"'\/\\]/;
    return wordBoundaryChars.test(before) && wordBoundaryChars.test(after);
  }

  calculateConfidence(concept, actualText) {
    const conceptLower = concept.toLowerCase();
    const actualTextLower = actualText.toLowerCase();
    
    if (conceptLower === actualTextLower) {
      return 1.0;
    }
    
    // Calculate similarity based on character differences
    const maxLength = Math.max(conceptLower.length, actualTextLower.length);
    const similarity = 1 - (this.levenshteinDistance(conceptLower, actualTextLower) / maxLength);
    
    return Math.max(0.7, similarity); // Minimum confidence of 0.7
  }

  // Helper function to calculate string similarity
  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
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
      const conceptLower = concept.toLowerCase();
      if (conceptLower.includes(searchText) || searchText.includes(conceptLower)) {
        suggestions.push({
          concept,
          cui,
          relevance: this.calculateRelevance(searchText, conceptLower)
        });
      }
      
      if (suggestions.length >= limit) break;
    }

    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }

  calculateRelevance(searchText, concept) {
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
      sampleConcepts: Array.from(this.concepts.entries()).slice(0, 5)
    };
  }


  findConceptOccurrences(text, concept) {
    if (!text || !concept) return [];
    
    const occurrences = [];
    const textLower = text.toLowerCase();
    const conceptLower = concept.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = textLower.indexOf(conceptLower, startIndex);
      if (index === -1) break;

      const endIndex = index + concept.length - 1;
      const actualText = text.substring(index, index + concept.length);
      
      if (this.isWordBoundary(text, index, concept.length)) {
        occurrences.push({
          start: index,
          end: endIndex,
          text: actualText,
          isWordBoundary: true
        });
      } else {
        occurrences.push({
          start: index,
          end: endIndex,
          text: actualText,
          isWordBoundary: false
        });
      }

      startIndex = index + 1;
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

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File too large. Maximum size is 10MB');
    }

    const text = await file.text();
    console.log('Loaded concept file content:', text.substring(0, 200) + '...');
    const count = conceptMatcher.loadConceptsFromCDB(text);
    
    return {
      success: true,
      conceptCount: count,
      fileName: file.name,
      fileSize: file.size,
      message: `Successfully loaded ${count} breast cancer concepts from ${file.name}`
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
      message: `Successfully loaded ${count} breast cancer concepts`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
