import './App.css';
import { mutators } from './utils/mutators';
import Syncosaurus from './utils/syncosaurus.js';
import { useSubscribe } from './utils/react.js';

class User {
  constructor() {
    this.id = Math.random();
  }
}

const user = new User();

//create an instance of the syncosaurus class, known as a client
const r = new Syncosaurus({
  mutators,
  userID: user.id,
});

const incrementKey = 'count';

function App() {
  const handleIncrementClick = () => {
    r.mutate.increment({ key: incrementKey, delta: 1 });
  };

  const handleDecrementClick = () => {
    r.mutate.decrement({ key: incrementKey, delta: 1 });
  };

  const cache = useSubscribe(r, incrementKey, { [incrementKey]: 0 });

  return (
    <div>
      <div>{cache[incrementKey]}</div>
      <button onClick={handleIncrementClick}>GROW</button>
      <button onClick={handleDecrementClick}>SHRINK</button>
    </div>
  );
}

export default App;
