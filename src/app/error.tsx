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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-10 w-10 text-red-600"
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

          <h1 className="mb-3 text-3xl font-semibold text-gray-900">Oops! Something went wrong</h1>

          <p className="text-foreground-muted mb-8 text-lg">
            We encountered an error while loading this page. Don't worry, it's not your fault.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => reset()}
            className="bg-relisten-600 w-full rounded-lg px-6 py-3 font-medium text-white transition-colors hover:bg-relisten-700 sm:w-auto"
          >
            Try again
          </button>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-gray-100 px-6 py-3 text-gray-900 transition-colors hover:bg-gray-200"
            >
              Go back
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="rounded-lg bg-gray-100 px-6 py-3 text-gray-900 transition-colors hover:bg-gray-200"
            >
              Go to homepage
            </button>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 rounded-lg border border-gray-200 bg-white p-4 text-left">
            <summary className="mb-3 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              🐛 Developer Info
            </summary>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Error Message:
                </span>
                <p className="mt-1 rounded bg-red-50 p-2 font-mono text-sm text-red-700">
                  {error.message}
                </p>
              </div>
              {error.digest && (
                <div>
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Error Digest:
                  </span>
                  <p className="mt-1 rounded bg-gray-50 p-2 font-mono text-sm text-gray-700">
                    {error.digest}
                  </p>
                </div>
              )}
              {error.stack && (
                <div>
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Stack Trace:
                  </span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
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
