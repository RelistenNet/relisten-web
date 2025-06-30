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
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-auto w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="h-8 w-8 text-red-600"
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

              <h1 className="mb-2 text-2xl font-semibold text-gray-900">Something went wrong</h1>

              <p className="text-foreground-muted mb-6">
                An unexpected error occurred. Please try again or contact support if the problem
                persists.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => reset()}
                  className="bg-relisten-600 w-full rounded-md px-4 py-2 text-white transition-colors hover:bg-relisten-700"
                >
                  Try again
                </button>

                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full rounded-md bg-gray-100 px-4 py-2 text-gray-900 transition-colors hover:bg-gray-200"
                >
                  Go to homepage
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs text-red-800">
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
