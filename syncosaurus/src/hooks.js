import { useState, useEffect } from 'react';

function useSubscribe(syncosaurus, query, initial) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const unsubscribe = syncosaurus.subscribe(query, newData => {
      setData(newData);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (data === null) {
    return initial;
  }

  return data;
}

function usePresence(syncosaurus) {
  const [presence, setPresence] = useState(syncosaurus.presence);
  useEffect(() => {
    syncosaurus.subscribePresence(setPresence);
  }, [syncosaurus]);
  return presence || {};
}

function useUpdateMyPresence(syncosaurus) {
  useEffect(() => {
    const listener = window.addEventListener('pointermove', e => {
      const mousePosition = { x: e.clientX, y: e.clientY };
      syncosaurus.updateMyPresence(mousePosition);
    });

    return () => {
      removeEventListener('mousemove', listener);
    };
  }, [syncosaurus]);
}
export { useSubscribe, usePresence, useUpdateMyPresence };
