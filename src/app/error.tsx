'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 mb-3">Oops! Something went wrong</h1>

          <p className="text-lg text-foreground-muted mb-8">
            We encountered an error while loading this page. Don't worry, it's not your fault.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-relisten-600 text-white px-6 py-3 rounded-lg hover:bg-relisten-700 transition-colors font-medium"
          >
            Try again
          </button>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go back
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="bg-gray-100 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go to homepage
            </button>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left bg-white p-4 rounded-lg border border-gray-200">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 mb-3">
              🐛 Developer Info
            </summary>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Error Message:
                </span>
                <p className="text-sm text-red-700 font-mono bg-red-50 p-2 rounded mt-1">
                  {error.message}
                </p>
              </div>
              {error.digest && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Error Digest:
                  </span>
                  <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded mt-1">
                    {error.digest}
                  </p>
                </div>
              )}
              {error.stack && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Stack Trace:
                  </span>
                  <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded mt-1 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
