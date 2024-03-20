import './App.css';
import { mutators } from './utils/mutators';
import Syncosaurus from './utils/syncosaurus.js';
import { useSubscribe } from './utils/react.js';
import { v4 as uuidv4 } from 'uuid';


// TODO MOVE THIS ELSEWHERE
class User {
  constructor() {
    this.id = uuidv4();
  }
}

const user = new User();

//create an instance of the syncosaurus class, known as a client
const synco = new Syncosaurus({
  mutators,
  userID: user.id,
});

const incrementKey = 'count';

function App() {
  const handleIncrementClick = () => {
    synco.mutate.increment({ key: incrementKey, delta: 1 });
  };

  const handleDecrementClick = () => {
    synco.mutate.decrement({ key: incrementKey, delta: 1 });
  };

  const count = useSubscribe(synco, (tx) => tx.get(incrementKey), 0);

  return (
    <div>
      <div>{count}</div>
      <button onClick={handleIncrementClick}>GROW</button>
      <button onClick={handleDecrementClick}>SHRINK</button>
    </div>
  );
}

export default App;
