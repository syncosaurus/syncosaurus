import './App.css';
import { mutators } from '../../../syncosaurus/mutators.js';
import {
  usePresence,
  useUpdateMyPresence,
} from '../../../syncosaurus/hooks.js';
import Syncosaurus from '../../../syncosaurus/syncosaurus.js';
import { v4 as uuidv4 } from 'uuid';

// TODO MOVE THIS ELSEWHERE
class User {
  constructor() {
    this.id = uuidv4();
  }
}

const user = new User();

const cursorStyleTemplate = {
  height: 20,
  width: 20,
  position: 'absolute',
  background: 'red',
};

//create an instance of the syncosaurus class, known as a client
const synco = new Syncosaurus({
  mutators,
  userID: user.id,
});

const OtherCursors = () => {
  const presence = usePresence(synco);
  useUpdateMyPresence(synco);

  return (
    <>
      {Object.entries(presence).map(([id, cursor]) => {
        return (
          <div
            key={id}
            style={{ ...cursorStyleTemplate, left: cursor.x, top: cursor.y }}
          >
            {id}
          </div>
        );
      })}
    </>
  );
};

function App() {
  return (
    <div>
      <OtherCursors />
    </div>
  );
}

export default App;
