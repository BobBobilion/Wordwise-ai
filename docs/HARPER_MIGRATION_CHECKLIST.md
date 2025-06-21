# Harper.js Migration Checklist

## Pre-Migration Setup

### Environment Preparation
- [ ] Install Harper.js: `npm install harper.js`
- [ ] Install diff library: `npm install diff-match-patch`
- [ ] Verify TypeScript integration and type definitions
- [ ] Test basic Harper.js functionality in development environment
- [ ] Create backup of current spelling and grammar API routes
- [ ] Document current API response formats for reference

### Planning & Documentation
- [ ] Review existing grammar and spelling API usage across the application
- [ ] Identify all components that use spelling/grammar checking
- [ ] Document current performance metrics for comparison
- [ ] Set up monitoring for migration progress
- [ ] Create rollback plan in case of issues

## Phase 1: Core Harper.js Integration

### API Route Creation
- [ ] Create new `/api/harper-check/route.ts` file
- [ ] Import Harper.js LocalLinter and binary
- [ ] Set up linter initialization with English configuration
- [ ] Implement basic text linting functionality
- [ ] Test Harper.js with sample text inputs
- [ ] Verify linter setup and teardown

### Response Mapping Implementation
- [ ] Create interface for Harper.js Lint objects
- [ ] Implement mapping from Harper.js response to GrammarSuggestion interface
- [ ] Handle position adjustments for text spans
- [ ] Test response mapping with various input types
- [ ] Validate suggestion format consistency
- [ ] Add error handling for malformed responses

### Basic API Functionality
- [ ] Implement POST endpoint for text checking
- [ ] Add input validation for text content
- [ ] Implement timeout handling (2-second limit)
- [ ] Add error handling for linter failures
- [ ] Test API with various text lengths and content types
- [ ] Verify API response format matches existing interface

## Phase 2: Diff-Based Linting Implementation

### Document Version Tracking
- [ ] Create DocumentVersion interface
- [ ] Implement document ID generation
- [ ] Add timestamp tracking for document versions
- [ ] Create ChangeSpan interface for diff tracking
- [ ] Test document version management
- [ ] Add validation for document state consistency

### Diff Algorithm Integration
- [ ] Import and configure diff-match-patch library
- [ ] Implement detectChanges function
- [ ] Create convertDiffsToSpans helper function
- [ ] Test diff detection with various text changes
- [ ] Validate change span accuracy
- [ ] Add error handling for diff algorithm failures

### Sliding Window Strategy
- [ ] Implement calculateLintWindow function
- [ ] Add window expansion logic (±200 characters)
- [ ] Create expandToSentenceBoundaries function
- [ ] Test window calculation with different change types
- [ ] Validate window boundaries don't exceed document limits
- [ ] Optimize window size based on document length

### Sentence-Level Caching
- [ ] Create SentenceCache interface
- [ ] Implement getSentenceHash function with MD5
- [ ] Add isCached function for cache checking
- [ ] Create DocumentCache class
- [ ] Implement cache update and invalidation logic
- [ ] Test caching with sentence-level granularity

## Phase 3: Cache Management System

### Cache Implementation
- [ ] Implement DocumentCache class with Map storage
- [ ] Add cache clearing on document change
- [ ] Create splitIntoSentences function
- [ ] Implement filterSuggestionsForSentence function
- [ ] Add cache timestamp management
- [ ] Test cache hit and miss scenarios

### Memory Management
- [ ] Create CacheManager class
- [ ] Implement maxCacheSize limit (1000 sentences)
- [ ] Add cleanup interval logic (5 minutes)
- [ ] Create LRU eviction strategy
- [ ] Test memory usage under load
- [ ] Add memory monitoring and logging

### Cache Configuration
- [ ] Define CacheConfig interface
- [ ] Set up configurable cache parameters
- [ ] Add cache statistics tracking
- [ ] Implement cache performance monitoring
- [ ] Test cache efficiency with various document sizes
- [ ] Validate cache consistency across sessions

## Phase 4: Diff-Based Processing Flow

### Change Detection Implementation
- [ ] Implement processDocumentChanges function
- [ ] Add change detection logic
- [ ] Create getCachedResults function
- [ ] Implement change processing loop
- [ ] Add window-based linting logic
- [ ] Test with various change scenarios

### Window Processing
- [ ] Implement getCachedSuggestionsForWindow function
- [ ] Create lintText function for window processing
- [ ] Add adjustPositions function for suggestion mapping
- [ ] Implement cacheWindowResults function
- [ ] Test window processing with different change types
- [ ] Validate position adjustments accuracy

### Fallback Strategy
- [ ] Implement lintWithFallback function
- [ ] Add DIFF_THRESHOLD constant
- [ ] Create performDiffBasedLinting function
- [ ] Implement performFullDocumentLinting function
- [ ] Add error handling for fallback scenarios
- [ ] Test fallback behavior under various conditions

## Phase 5: Performance Optimizations

### Window Size Optimization
- [ ] Implement calculateOptimalWindowSize function
- [ ] Add document length-based window sizing
- [ ] Test window size optimization with different document sizes
- [ ] Validate performance improvements
- [ ] Add window size monitoring
- [ ] Optimize window size thresholds

### Batch Processing
- [ ] Implement batchLintWindows function
- [ ] Add batch size configuration (5 windows)
- [ ] Create Promise.all batch processing
- [ ] Test batch processing efficiency
- [ ] Add batch size optimization
- [ ] Monitor batch processing performance

### API Integration Updates
- [ ] Update `/api/harper-check/route.ts` with diff support
- [ ] Add processingMethod tracking
- [ ] Implement processingTime measurement
- [ ] Add error handling with fallback
- [ ] Test API with diff-based processing
- [ ] Validate API response format

## Phase 6: Frontend Integration

### Rich Text Editor Updates
- [ ] Update `components/rich-text-editor.tsx`
- [ ] Add previousContent state management
- [ ] Implement documentId generation
- [ ] Update API call to include documentId and previousContent
- [ ] Modify debounced checking logic
- [ ] Test real-time checking functionality

### Document Version Tracking
- [ ] Add document version state to rich text editor
- [ ] Implement content change detection
- [ ] Add version comparison logic
- [ ] Test version tracking accuracy
- [ ] Validate state management
- [ ] Add error handling for version conflicts

### Suggestion Display Updates
- [ ] Update `components/sidebar/writing-suggestions.tsx`
- [ ] Modify suggestion handling for unified results
- [ ] Add processing method display
- [ ] Implement suggestion filtering and sorting
- [ ] Test suggestion display with new format
- [ ] Validate UI consistency

## Phase 7: Style Check Separation

### New Style Check API
- [ ] Create `/api/style-check/route.ts`
- [ ] Implement AI-based style checking
- [ ] Add style-specific suggestion types
- [ ] Test style checking functionality
- [ ] Validate style suggestion format
- [ ] Add error handling for style API

### Style Integration
- [ ] Integrate style suggestions with Harper.js results
- [ ] Update UI to display combined suggestions
- [ ] Add style suggestion filtering
- [ ] Test combined suggestion display
- [ ] Validate suggestion categorization
- [ ] Add style suggestion application logic

## Phase 8: Testing and Validation

### Performance Testing
- [ ] Test with small documents (<1000 characters)
- [ ] Test with medium documents (1000-5000 characters)
- [ ] Test with large documents (5000-20000 characters)
- [ ] Test with very large documents (>20000 characters)
- [ ] Measure processing times for each document size
- [ ] Compare performance with previous AI-based approach

### Diff-Based Linting Validation
- [ ] Test diff detection accuracy
- [ ] Validate window calculation correctness
- [ ] Test cache hit rates
- [ ] Verify suggestion position accuracy
- [ ] Test fallback to full document linting
- [ ] Validate processing method tracking

### Cache Efficiency Testing
- [ ] Test cache hit rates with repeated content
- [ ] Validate cache invalidation on document changes
- [ ] Test memory usage under load
- [ ] Verify cache cleanup functionality
- [ ] Test cache size limits
- [ ] Validate cache consistency

### Error Handling Validation
- [ ] Test linter initialization failures
- [ ] Validate timeout handling
- [ ] Test memory exhaustion scenarios
- [ ] Verify fallback behavior
- [ ] Test invalid input handling
- [ ] Validate error logging

### User Experience Testing
- [ ] Test real-time checking responsiveness
- [ ] Validate suggestion accuracy
- [ ] Test suggestion application functionality
- [ ] Verify UI consistency
- [ ] Test with various text types and languages
- [ ] Validate accessibility features

## Phase 9: Monitoring and Optimization

### Performance Monitoring Setup
- [ ] Add processing time tracking
- [ ] Implement diff vs full-document ratio monitoring
- [ ] Add cache hit rate tracking
- [ ] Set up memory usage monitoring
- [ ] Create performance dashboards
- [ ] Add alerting for performance issues

### Optimization Implementation
- [ ] Optimize window size based on real usage data
- [ ] Tune cache parameters based on performance metrics
- [ ] Optimize batch processing size
- [ ] Improve diff algorithm efficiency
- [ ] Optimize memory management
- [ ] Fine-tune debounce timing

### Documentation Updates
- [ ] Update API documentation
- [ ] Document new configuration options
- [ ] Create troubleshooting guide
- [ ] Update component documentation
- [ ] Document performance characteristics
- [ ] Create maintenance procedures

## Phase 10: Cleanup and Deployment

### Old API Removal
- [ ] Remove `/api/spelling-check/route.ts`
- [ ] Remove `/api/grammar-check/route.ts`
- [ ] Update any remaining references to old APIs
- [ ] Clean up unused dependencies
- [ ] Remove old API documentation
- [ ] Update import statements across the codebase

### Code Cleanup
- [ ] Remove unused imports and variables
- [ ] Clean up console.log statements
- [ ] Update comments and documentation
- [ ] Optimize code structure
- [ ] Remove temporary testing code
- [ ] Validate code quality standards

### Final Testing
- [ ] Run full application test suite
- [ ] Test all user workflows
- [ ] Validate production environment compatibility
- [ ] Test error scenarios
- [ ] Verify performance in production-like environment
- [ ] Conduct user acceptance testing

### Deployment
- [ ] Deploy to staging environment
- [ ] Run staging environment tests
- [ ] Deploy to production environment
- [ ] Monitor production performance
- [ ] Validate production functionality
- [ ] Document deployment success

## Post-Migration Tasks

### Performance Monitoring
- [ ] Monitor processing times in production
- [ ] Track cache efficiency metrics
- [ ] Monitor memory usage patterns
- [ ] Track error rates and types
- [ ] Analyze user feedback
- [ ] Document performance improvements

### Maintenance Planning
- [ ] Schedule regular Harper.js updates
- [ ] Plan cache optimization reviews
- [ ] Schedule performance monitoring reviews
- [ ] Plan error handling improvements
- [ ] Document maintenance procedures
- [ ] Create update rollback procedures

### Success Metrics Validation
- [ ] Compare processing times (target: <20ms)
- [ ] Validate cost savings (eliminated AI API costs)
- [ ] Confirm privacy improvements (no external text transmission)
- [ ] Measure user satisfaction improvements
- [ ] Document migration success metrics
- [ ] Plan future optimization opportunities

## Rollback Plan (If Needed)

### Emergency Rollback
- [ ] Restore old spelling and grammar API routes
- [ ] Revert frontend changes
- [ ] Update API endpoints back to original
- [ ] Test rollback functionality
- [ ] Validate system stability
- [ ] Document rollback procedures

### Data Recovery
- [ ] Restore any lost configuration
- [ ] Recover cached data if needed
- [ ] Validate data integrity
- [ ] Test system functionality
- [ ] Document recovery procedures
- [ ] Plan future migration attempt

---

**Migration Progress Tracking:**
- Total Tasks: 150+
- Completed: [ ] / [ ]
- Remaining: [ ] / [ ]
- Completion Percentage: [ ]%

**Notes:**
- Check off tasks as they are completed
- Add notes for any issues encountered
- Update completion percentage regularly
- Document any deviations from the plan 