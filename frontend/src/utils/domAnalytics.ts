/**
 * DOM Analytics for Memory Optimization
 * Mathematical monitoring of DOM element count and memory usage
 */

interface DOMAnalytics {
  elementCount: number;
  filterElementCount: number;
  memoryEstimate: number; // Rough estimate in bytes
  recommendations: string[];
}

export function analyzeDOMUsage(): DOMAnalytics {
  const allElements = document.querySelectorAll('*').length;
  const filterElements = document.querySelectorAll('[data-filter-item]').length;
  
  // Mathematical estimation: ~150 bytes per DOM element (conservative)
  const memoryEstimate = allElements * 150;
  
  const recommendations: string[] = [];
  
  // Mathematical thresholds based on browser performance
  if (allElements > 10000) {
    recommendations.push('🔴 Critical: >10k DOM elements. Consider virtualization.');
  } else if (allElements > 5000) {
    recommendations.push('⚠️  Warning: >5k DOM elements. Monitor performance.');
  } else if (allElements > 2000) {
    recommendations.push('ℹ️  Info: >2k DOM elements. Consider optimization.');
  }
  
  if (filterElements > 200) {
    recommendations.push('🔴 Critical: >200 filter elements. Enable search limits.');
  } else if (filterElements > 100) {
    recommendations.push('⚠️  Warning: >100 filter elements. Consider limits.');
  }
  
  if (memoryEstimate > 50 * 1024 * 1024) { // 50MB
    recommendations.push('🔴 Memory: Estimated >50MB DOM usage.');
  }
  
  return {
    elementCount: allElements,
    filterElementCount: filterElements,
    memoryEstimate,
    recommendations
  };
}

// Mathematical proof: Debounced analytics prevent performance impact
let analyticsTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleAnalytics(callback: (analytics: DOMAnalytics) => void, delay = 2000): void {
  if (analyticsTimeout) {
    clearTimeout(analyticsTimeout);
  }
  
  analyticsTimeout = setTimeout(() => {
    const analytics = analyzeDOMUsage();
    callback(analytics);
    analyticsTimeout = null;
  }, delay);
}

// Development helper for monitoring
export function enableDOMMonitoring(): () => void {
  return () => {}; // Disabled to prevent log spam
}

// Performance observer for layout thrashing
export function observeLayoutThrashing(): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') {
    return null;
  }
  
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      let layoutCount = 0;
      
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.includes('layout')) {
          layoutCount++;
        }
      });
      
      if (layoutCount > 10) {
        console.warn('⚠️  Layout thrashing detected:', layoutCount, 'layouts in measurement period');
      }
    });
    
    observer.observe({ entryTypes: ['measure', 'navigation'] });
    return observer;
  } catch (e) {
    console.warn('Performance observer not supported:', e);
    return null;
  }
}

// Mathematical utility: Calculate filter rendering cost
export function calculateFilterRenderingCost(
  _totalItems: number,
  visibleItems: number,
  avgStringLength: number
): {
  domElementsCost: number;
  memoryFootprint: number;
  renderingComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
} {
  // Cost per DOM element: base cost + text rendering cost
  const baseCostPerElement = 150; // bytes
  const textCostPerChar = 2; // bytes per character
  
  const domElementsCost = visibleItems * (baseCostPerElement + avgStringLength * textCostPerChar);
  
  let renderingComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  if (visibleItems <= 20) {
    renderingComplexity = 'LOW';
  } else if (visibleItems <= 50) {
    renderingComplexity = 'MEDIUM';
  } else if (visibleItems <= 100) {
    renderingComplexity = 'HIGH';
  } else {
    renderingComplexity = 'CRITICAL';
  }
  
  return {
    domElementsCost,
    memoryFootprint: domElementsCost,
    renderingComplexity
  };
}