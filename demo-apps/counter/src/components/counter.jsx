import { useSubscribe } from '../../../../syncosaurus/hooks.js';

const incrementKey = 'count';

export const Counter = ({ roomID, synco }) => {
  // create an instance of the syncosaurus class, known as a client
  if (synco.roomID !== roomID || !synco.hasLiveWebsocket()) {
    synco.launch(roomID);
  }

  const handleIncrementClick = () => {
    synco.mutate.increment({ key: incrementKey, delta: 1 });
  };

  const handleDecrementClick = () => {
    synco.mutate.decrement({ key: incrementKey, delta: 1 });
  };

  const count = useSubscribe(synco, tx => tx.get(incrementKey), 0);

  return (
    <div>
      <div>Current Room: {roomID}</div>
      <div>{count}</div>
      <button onClick={handleIncrementClick}>GROW</button>
      <button onClick={handleDecrementClick}>SHRINK</button>
    </div>
  );
};
