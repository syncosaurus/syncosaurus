import { useState, useEffect } from 'react';

//custom hook that returns data when the data the query relies on changes
function useSubscribe(syncosaurus, query, initial) {
  // State to store the key value pair
  const [data, setData] = useState(null);

  //runs when the component is rendered initially or the syncosaurus / query objects change
  useEffect(() => {
    // Subscribe to data using the provided syncosaurus subscription manager
    const unsubscribe = syncosaurus.subscribe(query, newData => {
      setData(newData);
    });

    // Cleanup function to unsubscribe when the component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  //if data is still null, then return the default value
  if (data === null) {
    return initial;
  }

  //otherwise return the data
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
