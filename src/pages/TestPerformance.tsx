/**
 * Static performance test page - no API calls
 * Use this to isolate build/infrastructure issues from data layer issues
 * 
 * Testing instructions:
 * 1. Run: npm run build
 * 2. Run: npm run preview
 * 3. Visit: http://localhost:4173/test-performance
 * 4. Run Lighthouse audit
 * 
 * Expected results:
 * - LCP should be < 1s (if higher, issue is in build/infrastructure)
 * - FCP should be < 0.8s
 * - Total JS should be < 500KB
 */
const TestPerformance = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Performance Test Page</h1>
      <p className="text-lg text-muted-foreground mb-8">
        This is a static page with no API calls or heavy components.
      </p>
      <div className="space-y-4 text-center">
        <p className="text-sm">
          <strong>LCP Target:</strong> &lt; 1.0s
        </p>
        <p className="text-sm">
          <strong>FCP Target:</strong> &lt; 0.8s
        </p>
        <p className="text-sm">
          <strong>Total Bundle:</strong> &lt; 500KB
        </p>
      </div>
    </div>
  );
};

export default TestPerformance;
