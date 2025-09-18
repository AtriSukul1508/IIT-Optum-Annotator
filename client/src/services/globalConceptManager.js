const { conceptMatcher, loadBreastCancerConcepts } = await import('./conceptMatching');

class GlobalConceptManager {
  constructor() {
    this.conceptsLoaded = false;
    this.loadedFileName = '';
    this.conceptData = null;
    this.listeners = new Set();
  }

  // Subscribe to changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all subscribers
  notify() {
    this.listeners.forEach(callback => callback({
      conceptsLoaded: this.conceptsLoaded,
      loadedFileName: this.loadedFileName,
      totalConcepts: this.conceptData ? this.conceptData.size : 0
    }));
  }

  // Load concepts and persist globally
  async loadConcepts(file) {
    try {
      const text = await file.text();
      const result = await this.processConceptText(text, file.name);
      
      if (result.success) {
        this.conceptsLoaded = true;
        this.loadedFileName = file.name;
        this.conceptData = conceptMatcher.concepts;
        this.notify();
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process concept text and load into conceptMatcher
  async processConceptText(text, fileName) {
    try {
      const result = await loadBreastCancerConcepts(text);
      
      return {
        success: result.success,
        conceptCount: result.conceptCount,
        fileName: fileName,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clear concepts
  clearConcepts() {
    this.conceptsLoaded = false;
    this.loadedFileName = '';
    this.conceptData = null;
    
    // Clear the conceptMatcher
    import('./conceptMatching').then(({ conceptMatcher }) => {
      conceptMatcher.concepts.clear();
      conceptMatcher.isLoaded = false;
    });
    
    this.notify();
  }

  // Get current state
  getState() {
    return {
      conceptsLoaded: this.conceptsLoaded,
      loadedFileName: this.loadedFileName,
      totalConcepts: this.conceptData ? this.conceptData.size : 0
    };
  }

  // Initialize from existing conceptMatcher state (for page refreshes)
  initializeFromExisting() {
    import('./conceptMatching').then(({ conceptMatcher }) => {
      if (conceptMatcher.isLoaded && conceptMatcher.concepts.size > 0) {
        this.conceptsLoaded = true;
        this.loadedFileName = 'Previously loaded concepts';
        this.conceptData = conceptMatcher.concepts;
        this.notify();
      }
    });
  }
}

// Create singleton instance
export const globalConceptManager = new GlobalConceptManager();
