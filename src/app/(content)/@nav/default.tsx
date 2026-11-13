import NavBar from '@/shell/NavBar';

// Any content URL the slot's pages do not match still gets the nav.
export default function NavDefault() {
  return <NavBar artistSlug={null} />;
}
