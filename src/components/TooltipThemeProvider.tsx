'use client';

import { ReactNode } from 'react';
import { TooltipThemeContext } from './Tooltip';

export default function TooltipThemeProvider({
  theme,
  children,
}: {
  theme: 'light' | 'dark' | 'auto';
  children: ReactNode;
}) {
  return (
    <TooltipThemeContext.Provider value={theme}>
      {children}
    </TooltipThemeContext.Provider>
  );
}
