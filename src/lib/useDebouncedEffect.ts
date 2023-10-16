import { useEffect, useRef } from 'react';

export default function useDebouncedEffect(effect, delay, dependencies) {
  const effectRef = useRef(effect);

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    const handler = setTimeout(() => {
      effectRef.current();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [...dependencies, delay]);
}
