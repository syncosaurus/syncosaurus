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
  }, [syncosaurus, query]);

  //if data is still null, then return the default value
  if (data === null) {
    return initial;
  }

  //otherwise return the data
  return data;
}

export { useSubscribe };
