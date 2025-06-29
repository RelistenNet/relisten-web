'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Something went wrong</h1>

              <p className="text-foreground-muted mb-6">
                An unexpected error occurred. Please try again or contact support if the problem
                persists.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => reset()}
                  className="w-full bg-relisten-600 text-white px-4 py-2 rounded-md hover:bg-relisten-700 transition-colors"
                >
                  Try again
                </button>

                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Go to homepage
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto text-red-800">
                    {error.message}
                    {error.stack && '\n\n' + error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
