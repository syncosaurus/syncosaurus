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

function App() {
  const cursors = useSubscribe(synco, 'cursors', {});
  console.log(cursors);
  return <div></div>;
}

export default App;
