'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col justify-center items-center p-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-700 mb-4">An unexpected error occurred. Please try again.</p>

        {error?.message && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800">Error Message:</h3>
            <p className="text-red-500 bg-red-50 p-2 rounded">{error.message}</p>
          </div>
        )}

        {error?.stack && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800">Error Stack:</h3>
            <pre className="bg-gray-200 p-4 rounded text-sm text-gray-600 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {error.stack}
            </pre>
          </div>
        )}

        <p className="text-gray-700 mb-4">
          If the problem persists, you can share a screenshot of this error in our{' '}
          <a
            href="/discord"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Discord server
          </a>{' '}
          for more help.
        </p>

        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
