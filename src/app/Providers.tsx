'use client';

import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux';

// const queryClient = new QueryClient()

export default function Providers({ children }: PropsWithChildren) {
  return <Provider store={store}>{children}</Provider>;
}
