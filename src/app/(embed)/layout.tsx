import EmbedHeader from '@/components/EmbedHeader';
import Flex from '@/components/Flex';
import Player from '@/components/Player';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export default async function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <Flex column className="h-screen bg-white">
      <Toaster id="audio-error" position="top-center" offset="54px" richColors closeButton />
      <EmbedHeader />
      <div className="flex h-[50px] min-h-[50px] items-center justify-center border-b border-gray-300 bg-white">
        <div className="w-full max-w-2xl">
          <Player />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </Flex>
  );
}
