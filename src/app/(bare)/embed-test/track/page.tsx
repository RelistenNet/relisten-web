export default function EmbedTrackTestPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Single Track Embed</h2>
        <p className="mb-4">Embed one track</p>
        <iframe
          src="/embed-track/goose/2024/02/08/lead-the-way"
          className="w-full border"
          height="76"
          title="Single Track Embed"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
        <p className="mb-4">Lorem Ipsum this is an article.......</p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Multi Track Embed (context=2)</h2>
        <p className="mt-4">Or if you want to embed multiple tracks, we can do that too:</p>
        <iframe
          src="/embed-track/goose/2024/02/08/lead-the-way?context=2"
          className="w-full border"
          height="187"
          title="Multi Track Embed"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
        <p className="mt-4">Lorem Ipsum this is an article.......</p>
      </div>
    </div>
  );
}
