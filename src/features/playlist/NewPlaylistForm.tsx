'use client';

import { usePendingNavigation, useRouter } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { useActionState } from 'react';
import { z } from 'zod/v4';
import { PlaylistName } from '@/domain/playlists';
import { createPlaylist } from '@/playlists/commands';
import { PlaylistWriteError } from '@/playlists/transport';
import { Button } from '@/ui/base/shadcn/button';
import { Input } from '@/ui/base/shadcn/input';
import { Textarea } from '@/ui/base/shadcn/textarea';

// Playlist writes go from the browser (src/playlists/transport.ts carries the
// session's CSRF token), so this form needs JavaScript, as the editor does.

const Form = z.object({
  name: PlaylistName,
  description: z
    .string()
    .trim()
    .transform((d) => d || undefined),
});

/**
 * What was typed (React resets the form after its action, so the fields take it
 * back as their defaults), and why the create failed, if it did.
 */
type State = { error: string | null; name: string; description: string } | null;

/** Creates an empty playlist, then opens it in the editor. */
export default function NewPlaylistForm() {
  const router = useRouter();
  const [state, create, pending] = useActionState(
    async (_prev: State, form: FormData): Promise<State> => {
      const typed = {
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
      };
      const parsed = Form.safeParse(typed);
      if (!parsed.success)
        return { error: parsed.error.issues[0]?.message ?? 'Check the name.', ...typed };
      try {
        const { playlistId } = await createPlaylist(parsed.data);
        router.push(href('/playlists/[playlist]/edit', { playlist: playlistId }));
        // The fields keep what was typed while the editor loads.
        return { error: null, ...typed };
      } catch (err) {
        const error =
          err instanceof PlaylistWriteError && err.kind === 'signed-out'
            ? 'Your session ended. Sign in again to create playlists.'
            : err instanceof PlaylistWriteError && err.kind === 'invalid' && err.detail
              ? err.detail
              : 'Couldn’t create it. Try again in a moment.';
        return { error, ...typed };
      }
    },
    null
  );
  // Still on its way to the editor: a second press would make a second playlist.
  const navigating = usePendingNavigation();
  const busy = pending || navigating;

  return (
    <form action={create} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-primary">Name</span>
        <Input
          name="name"
          defaultValue={state?.name}
          maxLength={100}
          required
          autoFocus
          aria-invalid={!!state?.error}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-primary">
          Description <span className="font-normal text-text-muted">(optional)</span>
        </span>
        <Textarea name="description" defaultValue={state?.description} rows={4} />
      </label>
      {state?.error && (
        <p role="alert" className="m-0 text-sm text-red-500">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create Playlist'}
        </Button>
      </div>
    </form>
  );
}
