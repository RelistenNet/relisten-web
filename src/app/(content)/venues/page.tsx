import VenuesIndex, { venuesIndexMetadata } from '@/features/venues-index/VenuesIndex';

/** Every venue, across all artists. */
export default function VenuesPage() {
  return <VenuesIndex />;
}

export const metadata = () => venuesIndexMetadata({});
