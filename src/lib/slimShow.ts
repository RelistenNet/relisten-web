import type { Show, Tour, Venue } from '@/types';

export type SlimShow = Pick<
  Show,
  | 'id'
  | 'uuid'
  | 'display_date'
  | 'has_soundboard_source'
  | 'popularity'
  | 'source_count'
  | 'avg_duration'
> & {
  venue?: Pick<Venue, 'name' | 'location'>;
  tour?: Pick<Tour, 'id' | 'name'>;
};

export function slimShow(s: Show): SlimShow {
  return {
    id: s.id,
    uuid: s.uuid,
    display_date: s.display_date,
    has_soundboard_source: s.has_soundboard_source,
    popularity: s.popularity,
    source_count: s.source_count,
    avg_duration: s.avg_duration,
    venue: s.venue ? { name: s.venue.name, location: s.venue.location } : undefined,
    tour: s.tour ? { id: s.tour.id, name: s.tour.name } : undefined,
  };
}

export const slimShows = (shows?: Show[] | null): SlimShow[] => (shows ?? []).map(slimShow);
