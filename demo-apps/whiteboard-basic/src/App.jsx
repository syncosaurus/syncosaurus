import './App.css';
import './styles.css';

import { useState, useMemo } from 'react';
// import {
//   useHistory,
//   useOthers,
//   RoomProvider,
//   useStorage,
//   useMutation,
//   useSelf,
// } from '../liveblocks.config';
// import { LiveMap, LiveObject } from '@liveblocks/client';
// import { shallow, ClientSideSuspense } from '@liveblocks/react';
// import { useRouter } from 'next/router';

const RoomProvider = () => {};
const ClientSideSuspense = () => {};
const useStorage = () => {};
const useMutation = () => {};
const useHistory = () => {};
const useOthers = () => {};
const useSelf = () => {};

function Room() {
  const roomId = 'nextjs-whiteboard';
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selectedShape: null }}
      initialStorage={{ shapes: {} }} // removed LiveMap
    >
      <div className={'container'}>
        <ClientSideSuspense fallback={<Loading />}>
          {() => <Canvas />}
        </ClientSideSuspense>
      </div>
    </RoomProvider>
  );
}

function Canvas() {
  const [isDragging, setIsDragging] = useState(false);
  const shapeIds = useStorage(root => Array.from(root.shapes.keys())); // TODO syncosaurus

  const history = useHistory();

  const insertRectangle = useMutation(({ storage, setMyPresence }) => {
    const shapeId = Date.now().toString();
    const shape = new Object({
      // TODO syncosize
      x: getRandomInt(300),
      y: getRandomInt(300),
      fill: getRandomColor(),
    });
    storage.get('shapes').set(shapeId, shape);
    setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
  }, []);

  const deleteRectangle = useMutation(({ storage, self, setMyPresence }) => {
    const shapeId = self.presence.selectedShape;
    if (!shapeId) {
      return;
    }

    storage.get('shapes').delete(shapeId);
    setMyPresence({ selectedShape: null });
  }, []);

  const onShapePointerDown = useMutation(
    ({ setMyPresence }, e, shapeId) => {
      history.pause();
      e.stopPropagation();

      setMyPresence({ selectedShape: shapeId }, { addToHistory: true });
      setIsDragging(true);
    },
    [history]
  );

  const onCanvasPointerUp = useMutation(
    ({ setMyPresence }) => {
      if (!isDragging) {
        setMyPresence({ selectedShape: null }, { addToHistory: true });
      }

      setIsDragging(false);
      history.resume();
    },
    [isDragging, history]
  );

  const onCanvasPointerMove = useMutation(
    ({ storage, self }, e) => {
      e.preventDefault();
      if (!isDragging) {
        return;
      }

      const shapeId = self.presence.selectedShape;
      if (!shapeId) {
        return;
      }

      const shape = storage.get('shapes').get(shapeId);

      if (shape) {
        shape.update({
          x: e.clientX - 50,
          y: e.clientY - 50,
        });
      }
    },
    [isDragging]
  );

  return (
    <>
      <div
        className={'canvas'}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {shapeIds.map(shapeId => {
          return (
            <Rectangle
              key={shapeId}
              id={shapeId}
              onShapePointerDown={onShapePointerDown}
            />
          );
        })}
      </div>
      <div className={'toolbar'}>
        <button onClick={() => insertRectangle()}>Rectangle</button>
        <button onClick={() => deleteRectangle()}>Delete</button>
        <button onClick={() => history.undo()}>Undo</button>
        <button onClick={() => history.redo()}>Redo</button>
      </div>
    </>
  );
}

function Rectangle({ shape, onShapePointerDown }) {
  const [selectedByMe, setSeletedByMe] = useState(false);
  const { id, x, y, fill } = shape;

  const handleShapePointerDown = e => {
    setSeletedByMe(true);
    onShapePointerDown(e, id);
  };

  return (
    <div
      onPointerDown={handleShapePointerDown}
      className={'rectangle'}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: !selectedByMe ? 'transform 120ms linear' : 'none', // this is a fancy css trick to smooth other user position updates I think
        backgroundColor: fill || '#CCC',
        borderColor: 'transparent',
      }}
    >
      {id}
    </div>
  );
}

const COLORS = [
  '#FF5733',
  '#FFC300',
  '#FFDC00',
  '#D2FF00',
  '#66FF00',
  '#00FF66',
  '#00FFD2',
  '#0095FF',
  '#0044FF',
  '#002BFF',
  '#5600FF',
  '#B200FF',
  '#FF00E6',
  '#FF0052',
  '#FF0033',
];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

// function Loading() {
//   return (
//     <div className={'container'}>
//       <div className={'loading'}>
//         <img src="https://liveblocks.io/loading.svg" alt="Loading" />
//       </div>
//     </div>
//   );
// }

const mockShapes = {
  1: {
    id: '1',
    x: getRandomInt(500),
    y: getRandomInt(500),
    fill: getRandomColor(),
  },
  2: {
    id: '2',
    x: getRandomInt(500),
    y: getRandomInt(500),
    fill: getRandomColor(),
  },
  3: {
    id: '3',
    x: getRandomInt(500),
    y: getRandomInt(500),
    fill: getRandomColor(),
  },
};

function App() {
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [shapes, setShapes] = useState(mockShapes);

  const handleShapePointerDown = (e, id) => {
    e.preventDefault(); // These e.preventDefaults stop text from being highlighted when the user clicks and holds/drags a rectangle
    setSelectedShapeId(id);
  };

  const handleCanvasPointerUp = e => {
    e.preventDefault();
    setSelectedShapeId(null);
  };

  const handleCanvasPointerMove = e => {
    if (!selectedShapeId) return;
    e.preventDefault();

    const x = Math.floor(e.clientX);
    const y = Math.floor(e.clientY);

    const newShape = { ...shapes[selectedShapeId], x, y };
    const newShapes = { ...shapes };
    newShapes[selectedShapeId] = newShape;
    setShapes(newShapes);
  };

  return (
    <>
      <div
        className="canvas"
        onPointerUp={handleCanvasPointerUp}
        onPointerMove={handleCanvasPointerMove}
      >
        <p>Selected shape: {selectedShapeId}</p>
        {Object.keys(shapes).map(id => (
          <Rectangle
            key={id}
            shape={shapes[id]}
            onShapePointerDown={handleShapePointerDown}
          />
        ))}
      </div>
    </>
  );
}

export default App;
