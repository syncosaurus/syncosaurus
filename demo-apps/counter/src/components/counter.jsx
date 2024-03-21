import { mutators } from '../../../../syncosaurus/mutators.js';
import Syncosaurus from '../../../../syncosaurus/syncosaurus.js';
import { useSubscribe } from '../../../../syncosaurus/hooks.js';
import { User } from '../utils/User.js';

// create an instance of a User to get userID
const user = new User();

const incrementKey = 'count';

const synco = new Syncosaurus({
  mutators,
  userID: user.id,
});

export const Counter = ({ roomID }) => {
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
      <div>{count}</div>
      <button onClick={handleIncrementClick}>GROW</button>
      <button onClick={handleDecrementClick}>SHRINK</button>
    </div>
  );
};
