import '../assets/App.css';
import { Counter } from './counter';
import { mockDatabase } from '../services/mockDatabase';
import { useState, useEffect } from 'react';
import {} from 'react-dom/client';

function App() {
  const [roomsAndRoomIDs, setRoomsAndRoomIDs] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    (async () => {
      setRoomsAndRoomIDs(await mockDatabase.getAllRooms());
    })();
  }, []);

  const handleButtonClick = event => {
    const room = event.target.innerText;
    setSelectedRoom(room);
  };

  return (
    <div>
      {roomsAndRoomIDs ? (
        Object.keys(roomsAndRoomIDs).map(room => {
          return (
            <button key={room} onClick={handleButtonClick}>
              {room}
            </button>
          );
        })
      ) : (
        <p>Loading...</p>
      )}
      {selectedRoom && (
        <Counter roomID={roomsAndRoomIDs[selectedRoom]} room={selectedRoom} />
      )}
    </div>
  );
}

export default App;
