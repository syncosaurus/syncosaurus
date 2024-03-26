import { Counter } from './counter';
import Syncosaurus from '../../../../syncosaurus/syncosaurus.js';
import { mutators } from '../../../../syncosaurus/mutators.js';
import { getToken } from '../authHandler.js';
import { User } from '../utils/User.js';
import { useState, useEffect } from 'react';
import '../assets/App.css';

const serverUrl = import.meta.env.SERVER_URL || 'http://localhost:8787';
const user = new User();

const synco = new Syncosaurus({
  mutators,
  userID: user.id,
  // Utilzing JWT auth worker's exposed method for this - Dev can use their own implementation, Clerk, OAuth, etc.
  auth: await getToken(),
});

function App() {
  const [encryptedRoomNameList, setEncryptedRoomNameList] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const fetchList = async () => {
      const response = await fetch(`${serverUrl}/syncosaurus`, {
        headers: {
          'Authorization': `Bearer ${synco.auth}`,
        }
      });
      const { encryptedRoomNameList: list } = await response.json();

      setEncryptedRoomNameList(list);
    };

    fetchList();
  }, []);

  const handleButtonClick = async (e, roomName) => {
    e.preventDefault();

    setSelectedRoom(roomName);
  };

  const handleNewRoomFormSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch(`${serverUrl}/syncosaurus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newRoomName }),
    });

    const { encryptedRoomName: confirmedRoomName } = await response.json();
    let message;

    if (confirmedRoomName) {
      message = `Room '${newRoomName}' successfully created with an encrypted room name of '${confirmedRoomName}'`
    } else {
      message = `Room '${newRoomName}' was not able to be created`;
    }

    console.log(message);
    setEncryptedRoomNameList(encryptedRoomNameList.concat(confirmedRoomName));
  };

  return (
    <>
    <div>
        <label htmlFor="newRoomForm">Add New Room Entry: </label>
        <form id="newRoomForm" onSubmit={handleNewRoomFormSubmit}>
          <input type="text" onChange={(e) => setNewRoomName(e.target.value)} />
          <button type="submit">Add</button>
        </form>
      </div>
      <pre></pre>
      <div>
        {encryptedRoomNameList.length ? (
          encryptedRoomNameList.map(roomName => {
            return (
              <button
                key={roomName}
                onClick={e => handleButtonClick(e, roomName)}
              >
                {roomName}
              </button>
            );
          })
        ) : (
          <p>There are no rooms!</p>
        )}

        {selectedRoom && <Counter roomID={selectedRoom} synco={synco} />}
      </div>
    </>
  );
}

export default App;
