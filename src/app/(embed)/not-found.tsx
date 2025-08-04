export default function NotFound() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4">
        <div className="mx-auto w-full max-w-lg text-center">
          <h1 className="text-3xl font-semibold text-gray-900">404 - Show Not Found</h1>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: '404 - Page Not Found',
};
