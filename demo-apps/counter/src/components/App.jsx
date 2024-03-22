import '../assets/App.css';
import { Counter } from './counter';
// import { mockDatabase } from '../services/mockDatabase';
import { useState, useEffect } from 'react';

const baseURL = "http://localhost:8787";

function App() {
  const [encryptedRoomNameList, setEncryptedRoomNameList] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const fetchList = async () => {
      const response = await fetch(`${baseURL}/syncosaurus`);
      const { encryptedRoomNameList: list } = await response.json();

      setEncryptedRoomNameList(list);
    };

    fetchList();
  }, []);

  const handleButtonClick = async (e, roomName) => {
    e.preventDefault();

    setSelectedRoom(roomName);
  };

  return (
    <div>
      {encryptedRoomNameList.length ? (
        encryptedRoomNameList.map(roomName => {
          return (
            <button key={roomName} onClick={(e) => handleButtonClick(e, roomName)}>
              {roomName}
            </button>
          );
        })
      ) : (
        <p>Loading...</p>
      )}
      {selectedRoom && (
        <Counter roomID={selectedRoom}/>
      )}
    </div>
  );
}

export default App;
