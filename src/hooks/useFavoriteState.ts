'use client';

import { useCallback, useMemo } from 'react';
import useCookie from 'react-use-cookie';
import { useRouter } from 'next/navigation';
import { FAVORITE_ARTIST_COOKIE_NAME } from '@/lib/constants';

export function useFavoriteState(initialFavorites: string[]) {
  const router = useRouter();
  const defaultValue = initialFavorites ? JSON.stringify(initialFavorites) : '[]';
  const [_cookieValue, setCookieValue] = useCookie(FAVORITE_ARTIST_COOKIE_NAME, defaultValue);

  const favorites = useMemo(() => {
    try {
      return initialFavorites;
    } catch {
      return [] as string[];
    }
  }, [initialFavorites]);

  const isFavorite = useCallback(
    (artistId: string) => {
      return favorites.includes(artistId);
    },
    [favorites]
  );

  const setFavorites = useCallback(
    (updatedFavorites: string[]) => {
      setCookieValue(JSON.stringify(updatedFavorites), {
        days: 3650, // 10 years
        SameSite: 'Lax',
      });

      router.refresh();
    },
    [setCookieValue, router]
  );

  const toggleFavorite = useCallback(
    (artistId: string) => {
      const updatedFavorites = new Set([...initialFavorites]);

      if (updatedFavorites.has(artistId)) {
        updatedFavorites.delete(artistId);
      } else {
        updatedFavorites.add(artistId);
      }

      setFavorites([...updatedFavorites]);
    },
    [favorites, setFavorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
