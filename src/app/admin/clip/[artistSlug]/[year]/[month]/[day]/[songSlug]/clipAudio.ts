'use client';

import {
  Input,
  Output,
  UrlSource,
  ALL_FORMATS,
  Mp3OutputFormat,
  BufferTarget,
  Conversion,
} from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

let mp3EncoderRegistered = false;
function ensureMp3Encoder() {
  if (mp3EncoderRegistered) return;
  registerMp3Encoder();
  mp3EncoderRegistered = true;
}

export async function clipAudio({
  url,
  startSec,
  lengthSec,
}: {
  url: string;
  startSec: number;
  lengthSec: number;
}): Promise<{ blob: Blob; ext: string }> {
  ensureMp3Encoder();

  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(url),
  });

  const output = new Output({
    format: new Mp3OutputFormat(),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: startSec, end: startSec + lengthSec },
    tags: {},
  });

  await conversion.execute();

  const buffer = output.target.buffer;
  if (!buffer) throw new Error('Conversion produced no output buffer.');

  return { blob: new Blob([buffer], { type: 'audio/mpeg' }), ext: 'mp3' };
}
