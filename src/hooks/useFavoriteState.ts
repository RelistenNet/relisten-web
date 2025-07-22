'use client';

import { useCallback, useMemo } from 'react';
import useCookie from 'react-use-cookie';
import { useRouter } from 'next/navigation';

export function useFavoriteState(initialFavorites: string[]) {
  const router = useRouter();
  const defaultValue = initialFavorites ? JSON.stringify(initialFavorites) : '[]';
  const [cookieValue, setCookieValue] = useCookie('relisten_favorites:artists', defaultValue);

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
        days: 365,
        SameSite: 'Lax',
      });

      router.refresh();
    },
    [setCookieValue, router]
  );

  const toggleFavorite = useCallback(
    (artistId: string) => {
      let updatedFavorites = [...favorites];

      if (favorites.includes(artistId)) {
        updatedFavorites = updatedFavorites.filter((favorite) => favorite !== artistId);
      } else {
        updatedFavorites.push(artistId);
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
