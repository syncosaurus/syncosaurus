import './App.css';
import { useState } from 'react';
import { mutators } from '../../../../syncosaurus/mutators.js';
// import {
//   usePresence,
//   useUpdateMyPresence,
// } from '../../../syncosaurus/hooks.js';
import Syncosaurus from '../../../../syncosaurus/syncosaurus.js';
import { v4 as uuidv4 } from 'uuid';
import { useSubscribe } from '../../../../syncosaurus/hooks.js';

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

const roomID = 'eIBMeQwHNDhnm5NSetIJ/kn17q8=';
synco.launch(roomID);

function App() {
  const [inputValue, setInputValue] = useState('');

  function handleChange(e) {
    setInputValue(e.target.value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    synco.mutate.addTodo({
      id: uuidv4(),
      text: inputValue,
    });

    setInputValue('');
  }

  function handleDelete(id) {
    synco.mutate.removeTodo({ id });
  }

  const todos = useSubscribe(
    synco,
    tx => {
      let todoObject = tx.scan(key => {
        return key.includes('todo');
      });
      return Object.values(todoObject);
    },
    []
  );

  return (
    <div>
      <form>
        <input type="text" value={inputValue} onChange={handleChange} />
        <button onClick={handleSubmit}>Add Todo</button>
      </form>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            {todo.text}
            <button onClick={() => handleDelete(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
