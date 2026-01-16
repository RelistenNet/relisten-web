import { cookies } from 'next/headers';
import { FAVORITE_ARTIST_COOKIE_NAME } from './constants';



// Server-side function to read filter cookies
export async function getServerFavorites(): Promise<string[]> {
  const cookieStore = await cookies();

  try {
    const value = cookieStore.get(FAVORITE_ARTIST_COOKIE_NAME)?.value;
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error parsing favorites cookie on server:', error);
  }

  return [];
}
