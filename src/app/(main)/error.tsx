'use client';

export default function Error(err) {
  console.log(err?.stack);
  return 'error...';
}
