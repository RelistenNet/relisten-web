import Flex from '@/ui/base/Flex';
import Player from '@/player/PlayerBar';
import EmbedHeader from '@/features/embed/EmbedHeader';
import TooltipThemeProvider from '@/ui/base/TooltipThemeProvider';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export default async function EmbedTrackLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipThemeProvider theme="light">
      <Flex column className="embed-force-light bg-white">
        <Toaster id="audio-error" position="top-center" offset="30px" richColors closeButton />
        <div className="flex h-[50px] min-h-[50px] items-center justify-center border-b border-gray-300">
          <div className="w-full max-w-2xl">
            <Player />
          </div>
        </div>
        {children}
        <EmbedHeader compact />
      </Flex>
    </TooltipThemeProvider>
  );
}
