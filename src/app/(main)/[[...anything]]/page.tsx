import ArtistsColumn from '../../../components/ArtistsColumn';
import Flex from '../../../components/Flex';
import ShowsColumn from '../../../components/ShowsColumn';
import SongsColumn from '../../../components/SongsColumn';
import TapesColumn from '../../../components/TapesColumn';
import YearsColumn from '../../../components/YearsColumn';

export default function Page() {
  return (
    <Flex className="flex-1 flex-row gap-8 overflow-y-auto px-4">
      <ArtistsColumn />
      <YearsColumn />
      <ShowsColumn />
      <SongsColumn />
      <TapesColumn />
    </Flex>
  );
}
