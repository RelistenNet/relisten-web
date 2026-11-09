import ArtistsSelectionTab from './ArtistsSelectionTab';

// The primary artists come from the layout's <PrimaryArtists>. The much longer
// archive list is fetched by the client from /api/artists/archive, so it isn't
// serialized into every page's RSC payload.
const ArtistsColumn = () => <ArtistsSelectionTab />;

export default ArtistsColumn;
