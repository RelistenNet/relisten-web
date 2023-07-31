import { QueryClient } from '@tanstack/react-query';
import ky from 'ky';
import { cache } from 'react';
import { API_DOMAIN } from '../lib/constants';

export const getQueryClient = cache(() => new QueryClient());

export const fetchArtists = async () => {
  const parsed = await ky(`${API_DOMAIN}/api/v2/artists`).json();

  return parsed;
};
