export default function EmbedTestPage() {
  return (
    <iframe
      src="/wsp"
      className="w-4/5 mx-auto h-screen border-4"
      title="Embedded Relisten"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
