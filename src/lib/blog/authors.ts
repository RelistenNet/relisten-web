export interface Author {
  name: string;
  url?: string;
}

export const authors: Record<string, Author> = {
  'Daniel Saewitz': {
    name: 'Daniel Saewitz',
    url: 'https://saewitz.com',
  },
  'Alec Gorge': {
    name: 'Alec Gorge',
    url: 'https://alecgorge.com',
  },
};

export function getAuthor(name: string): Author {
  return authors[name] ?? { name };
}
