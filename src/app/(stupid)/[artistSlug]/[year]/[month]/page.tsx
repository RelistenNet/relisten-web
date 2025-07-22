import RelistenAPI from '@/lib/RelistenAPI';
import { format } from 'date-fns';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ artistSlug: string; year: string; month: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artistSlug, year, month } = await params;
  const artists = await RelistenAPI.fetchArtists();
  const artist = artists?.find((a) => a.slug === artistSlug);

  if (!artist) {
    return { title: 'Not Found' };
  }

  return {
    title: `Index of /${artist.slug}/${year}/${month}`,
  };
}

function formatFileSize(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(date: string): string {
  return format(new Date(date), 'dd-MMM-yyyy HH:mm');
}

export default async function MonthPage({ params }: Props) {
  const { artistSlug, year, month } = await params;

  // Fetch artist and shows
  const [artists, artistShows] = await Promise.all([
    RelistenAPI.fetchArtists(),
    RelistenAPI.fetchYearShows(artistSlug, year),
  ]);

  const artist = artists?.find((a) => a.slug === artistSlug);
  if (!artist || !artistShows) {
    notFound();
  }

  const shows = artistShows.shows || [];

  // Filter shows for the specific month
  const monthShows = shows.filter((show) => {
    const showMonth = new Date(show.display_date || '').getMonth() + 1;
    return showMonth === parseInt(month, 10);
  });

  // Sort shows by date
  monthShows.sort(
    (a, b) => new Date(a.display_date || '').getTime() - new Date(b.display_date || '').getTime()
  );

  return (
    <div className="bg-white p-4 font-serif text-black">
      <h1 className="mb-4 text-2xl font-bold">
        Index of /{artist.slug}/{year}/{month}/
      </h1>
      <table className="border-collapse">
        <tbody>
          <tr>
            <th className="py-1 pr-2 align-top">
              <svg width="20" height="16" viewBox="0 0 20 16">
                <defs>
                  <pattern id="halftone" patternUnits="userSpaceOnUse" width="2" height="2">
                    <circle cx="1" cy="1" r="0.3" fill="#666" />
                  </pattern>
                </defs>
                <rect
                  x="2"
                  y="2"
                  width="16"
                  height="12"
                  fill="url(#halftone)"
                  stroke="#333"
                  strokeWidth="1"
                />
                <rect x="4" y="4" width="4" height="1" fill="#333" />
                <rect x="4" y="6" width="6" height="1" fill="#333" />
                <rect x="4" y="8" width="5" height="1" fill="#333" />
              </svg>
            </th>
            <th className="py-1 pr-8 text-left">
              <a href="?C=N;O=D" className="text-black no-underline hover:underline">
                Name
              </a>
            </th>
            <th className="py-1 pr-8 text-left">
              <a href="?C=M;O=A" className="text-black no-underline hover:underline">
                Last modified
              </a>
            </th>
            <th className="py-1 pr-8 text-left">
              <a href="?C=S;O=A" className="text-black no-underline hover:underline">
                Size
              </a>
            </th>
            <th className="py-1 text-left">
              <a href="?C=D;O=A" className="text-black no-underline hover:underline">
                Description
              </a>
            </th>
          </tr>
          <tr>
            <th colSpan={5}>
              <hr className="border-0 border-t border-gray-400" />
            </th>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="py-1 pr-2 align-top">
              <svg width="20" height="16" viewBox="0 0 20 16">
                <defs>
                  <pattern id="folderHalftone" patternUnits="userSpaceOnUse" width="3" height="3">
                    <circle cx="0.5" cy="0.5" r="0.4" fill="#c49102" />
                    <circle cx="2" cy="1.5" r="0.3" fill="#c49102" />
                    <circle cx="1" cy="2.5" r="0.2" fill="#c49102" />
                  </pattern>
                  <pattern id="folderShadow" patternUnits="userSpaceOnUse" width="2" height="2">
                    <circle cx="0.5" cy="0.5" r="0.2" fill="#8b6914" />
                  </pattern>
                </defs>
                <path
                  d="M1 2l1-1h4l2 2h10v1H1V2z"
                  fill="url(#folderHalftone)"
                  stroke="#8b6914"
                  strokeWidth="0.5"
                />
                <path
                  d="M2 4h5l2-2h9v12H2V4z"
                  fill="url(#folderHalftone)"
                  stroke="#8b6914"
                  strokeWidth="1"
                />
                <path d="M3 6h3v1h-3z" fill="url(#folderShadow)" />
                <circle cx="4" cy="8" r="0.5" fill="#8b6914" />
                <circle cx="6" cy="10" r="0.3" fill="#8b6914" />
              </svg>
            </td>
            <td className="py-1 pr-8">
              <Link
                href={`/${artistSlug}/${year}`}
                className="text-blue-700 no-underline visited:text-purple-700 hover:underline"
              >
                Parent Directory
              </Link>
            </td>
            <td className="py-1 pr-8">&nbsp;</td>
            <td className="py-1 pr-8 text-right"> - </td>
            <td className="py-1">&nbsp;</td>
          </tr>

          {monthShows.map((show) => {
            const showDate = new Date(show.display_date || '');
            const dayStr = showDate.getDate().toString().padStart(2, '0');
            const showPath = `${dayStr}/`;

            return (
              <tr key={show.id} className="hover:bg-gray-50">
                <td className="py-1 pr-2 align-top">
                  <svg width="20" height="16" viewBox="0 0 20 16">
                    <defs>
                      <pattern
                        id="dirHalftone"
                        patternUnits="userSpaceOnUse"
                        width="2.5"
                        height="2.5"
                      >
                        <circle cx="0.3" cy="0.3" r="0.3" fill="#1e40af" />
                        <circle cx="1.5" cy="1" r="0.2" fill="#1e40af" />
                        <circle cx="0.8" cy="2" r="0.25" fill="#1e40af" />
                      </pattern>
                      <pattern id="dirDots" patternUnits="userSpaceOnUse" width="4" height="4">
                        <circle cx="1" cy="1" r="0.4" fill="#1d4ed8" />
                        <circle cx="3" cy="3" r="0.3" fill="#1d4ed8" />
                      </pattern>
                    </defs>
                    <path
                      d="M2 4h5l2-2h9v12H2V4z"
                      fill="url(#dirHalftone)"
                      stroke="#1e3a8a"
                      strokeWidth="1"
                    />
                    <rect x="4" y="6" width="10" height="1" fill="url(#dirDots)" />
                    <rect x="4" y="8" width="8" height="1" fill="url(#dirDots)" />
                    <rect x="4" y="10" width="6" height="1" fill="url(#dirDots)" />
                    <circle cx="15" cy="7" r="0.5" fill="#1e3a8a" />
                    <circle cx="13" cy="9" r="0.3" fill="#1e3a8a" />
                  </svg>
                </td>
                <td className="py-1 pr-8">
                  <Link
                    href={`/${artistSlug}/${year}/${month}/${dayStr}`}
                    className="text-blue-700 no-underline visited:text-purple-700 hover:underline"
                  >
                    {showPath}
                  </Link>
                </td>
                <td className="py-1 pr-8 text-center">{formatDate(show.display_date || '')}</td>
                <td className="py-1 pr-8 text-right">
                  {show.avg_duration && show.avg_duration > 0
                    ? formatFileSize(show.avg_duration)
                    : '-'}
                </td>
                <td className="py-1">
                  {show.venue?.name || ''} {show.venue?.location ? `- ${show.venue.location}` : ''}
                </td>
              </tr>
            );
          })}

          {monthShows.length === 0 && (
            <tr>
              <td colSpan={5} className="pt-4 pb-4 text-center">
                No files found for /{artistSlug}/{year}/{month}
              </td>
            </tr>
          )}
          <tr>
            <th colSpan={5}>
              <hr className="border-0 border-t border-gray-400" />
            </th>
          </tr>
        </tbody>
      </table>
      <address className="m-2 italic">Apache/2.4.41 (Unix) Server at relisten.net Port 80</address>
    </div>
  );
}
