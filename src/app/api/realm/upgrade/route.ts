import { NextRequest, NextResponse } from 'next/server';
import Realm from 'realm';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Realm schemas
const FavoritedArtistSchema = {
  name: 'FavoritedArtist',
  primaryKey: 'uuid',
  properties: {
    uuid: 'string',
    created_at: 'date',
  },
};

const FavoritedShowSchema = {
  name: 'FavoritedShow',
  primaryKey: 'uuid',
  properties: {
    uuid: 'string',
    created_at: 'date',
    show_date: 'date',
    artist_uuid: 'string',
  },
};

const FavoritedSourceSchema = {
  name: 'FavoritedSource',
  primaryKey: 'uuid',
  properties: {
    uuid: 'string',
    created_at: 'date',
    artist_uuid: 'string',
    show_uuid: 'string',
    show_date: 'date',
  },
};

const FavoritedTrackSchema = {
  name: 'FavoritedTrack',
  primaryKey: 'uuid',
  properties: {
    uuid: 'string',
    created_at: 'date',
    artist_uuid: 'string',
    show_uuid: 'string',
    source_uuid: 'string',
  },
};

const RecentlyPlayedTrackSchema = {
  name: 'RecentlyPlayedTrack',
  primaryKey: 'uuid',
  properties: {
    uuid: 'string',
    created_at: 'date',
    artist_uuid: 'string',
    show_uuid: 'string',
    source_uuid: 'string',
    track_uuid: 'string',
    updated_at: 'date',
    past_halfway: 'bool',
  },
};

const OfflineTrackSchema = {
  name: 'OfflineTrack',
  primaryKey: 'track_uuid',
  properties: {
    track_uuid: 'string',
    artist_uuid: 'string',
    show_uuid: 'string',
    source_uuid: 'string',
    created_at: 'date',
    state: 'int',
    file_size: 'int?',
  },
};

const OfflineSourceSchema = {
  name: 'OfflineSource',
  primaryKey: 'source_uuid',
  properties: {
    source_uuid: 'string',
    artist_uuid: 'string',
    show_uuid: 'string',
    year_uuid: 'string',
    created_at: 'date',
  },
};

// Define enum for OfflineTrackState
enum OfflineTrackState {
  UNKNOWN = 0,
  DOWNLOAD_QUEUED = 1,
  DOWNLOADING = 2,
  DOWNLOADED = 3,
  DELETING = 4,
}

interface FavoritedArtist {
  uuid: string;
  created_at: Date;
}

interface FavoritedShow {
  uuid: string;
  created_at: Date;
  show_date: Date;
  artist_uuid: string;
}

interface FavoritedSource {
  uuid: string;
  created_at: Date;
  artist_uuid: string;
  show_uuid: string;
  show_date: Date;
}

interface FavoritedTrack {
  uuid: string;
  created_at: Date;
  artist_uuid: string;
  show_uuid: string;
  source_uuid: string;
}

interface OfflineTrack {
  track_uuid: string;
  artist_uuid: string;
  show_uuid: string;
  source_uuid: string;
  created_at: Date;
  state: OfflineTrackState;
  file_size?: number;
}

interface LegacyDatabaseContents {
  trackUuids: string[];
  showUuids: string[];
  sources: FavoritedSource[];
  artistUuids: string[];
  offlineTracksBySource: Record<string, OfflineTrack[]>;
  schemaVersion: number;
}

function aggregateBy<T, K extends string | number>(
  items: T[],
  keySelector: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keySelector(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;

  try {
    // Parse multipart form data to get the binary database file
    const formData = await request.formData();
    const databaseFile = formData.get('database') as File;

    if (!databaseFile) {
      return NextResponse.json({ error: 'Database file is required' }, { status: 400 });
    }

    // Create temporary file path
    const timestamp = Date.now();
    tempInputPath = join(tmpdir(), `realm_input_${timestamp}.realm`);

    // Write uploaded file to temporary location
    const databaseBuffer = Buffer.from(await databaseFile.arrayBuffer());
    writeFileSync(tempInputPath, databaseBuffer);

    // Open realm with flexible schema to handle different versions
    let realm: Realm;
    try {
      // Try to open with known schemas first
      realm = new Realm({
        path: tempInputPath,
        readOnly: true,
        schema: [
          FavoritedArtistSchema,
          FavoritedShowSchema,
          FavoritedSourceSchema,
          FavoritedTrackSchema,
          RecentlyPlayedTrackSchema,
          OfflineTrackSchema,
          OfflineSourceSchema,
        ],
      });
    } catch {
      // If that fails, try without schema to read any version
      try {
        realm = new Realm({ path: tempInputPath, readOnly: true });
      } catch {
        return NextResponse.json(
          { error: 'Unable to read database or unsupported version' },
          { status: 400 }
        );
      }
    }

    const schemaVersion = realm.schemaVersion;

    // Extract legacy data
    const legacyData: LegacyDatabaseContents = {
      trackUuids: [],
      showUuids: [],
      sources: [],
      artistUuids: [],
      offlineTracksBySource: {},
      schemaVersion,
    };

    try {
      // Query for favorite tracks
      const favoriteTracks = realm.objects<FavoritedTrack>('FavoritedTrack');
      legacyData.trackUuids = Array.from(favoriteTracks)
        .map((o) => o.uuid.toLowerCase())
        .sort();

      // Query for favorite shows
      const favoriteShows = realm.objects<FavoritedShow>('FavoritedShow');
      legacyData.showUuids = Array.from(favoriteShows)
        .map((o) => o.uuid.toLowerCase())
        .sort();

      // Query for favorite sources
      const favoriteSources = realm.objects<FavoritedSource>('FavoritedSource');
      legacyData.sources = Array.from(favoriteSources).map((o) => ({
        uuid: o.uuid.toLowerCase(),
        created_at: o.created_at,
        artist_uuid: o.artist_uuid.toLowerCase(),
        show_uuid: o.show_uuid.toLowerCase(),
        show_date: o.show_date,
      }));

      // Query for favorite artists
      const favoriteArtists = realm.objects<FavoritedArtist>('FavoritedArtist');
      legacyData.artistUuids = Array.from(favoriteArtists)
        .map((o) => o.uuid.toLowerCase())
        .sort();

      // Get offline tracks that are downloaded
      const offlineTracks = realm.objects<OfflineTrack>('OfflineTrack');
      const downloadedTracks = Array.from(offlineTracks)
        .filter((o) => o.state === OfflineTrackState.DOWNLOADED)
        .map((o) => ({
          track_uuid: o.track_uuid.toLowerCase(),
          artist_uuid: o.artist_uuid.toLowerCase(),
          show_uuid: o.show_uuid.toLowerCase(),
          source_uuid: o.source_uuid.toLowerCase(),
          created_at: o.created_at,
          state: o.state,
          file_size: o.file_size,
        }));

      legacyData.offlineTracksBySource = aggregateBy(downloadedTracks, (t) => t.source_uuid);
    } catch (error) {
      console.warn('Some data could not be extracted:', error);
    }

    realm.close();

    return NextResponse.json({
      success: true,
      data: legacyData,
      isEmpty: !(
        legacyData.trackUuids.length > 0 ||
        legacyData.showUuids.length > 0 ||
        legacyData.sources.length > 0 ||
        legacyData.artistUuids.length > 0 ||
        Object.entries(legacyData.offlineTracksBySource).length > 0
      ),
    });
  } catch (error) {
    console.error('Database parsing failed:', error);

    return NextResponse.json(
      {
        error: 'Database parsing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    try {
      if (tempInputPath) unlinkSync(tempInputPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
