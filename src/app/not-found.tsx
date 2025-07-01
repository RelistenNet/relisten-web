import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-10 w-10 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="mb-3 text-3xl font-semibold text-gray-900">404 - Page Not Found</h1>

          <p className="text-foreground-muted mb-8 text-lg">
            Looks like this show got lost in the lot. The page you're looking for doesn't exist.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="bg-relisten-600 inline-block w-full rounded-lg px-6 py-3 font-medium text-white transition-colors hover:bg-relisten-700 sm:w-auto"
          >
            Go to homepage
          </Link>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-gray-100 px-6 py-3 text-gray-900 transition-colors hover:bg-gray-200"
            >
              Go back
            </button>

            <Link
              href="/artists"
              className="rounded-lg bg-gray-100 px-6 py-3 text-gray-900 transition-colors hover:bg-gray-200"
            >
              Browse artists
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: '404 - Page Not Found',
};