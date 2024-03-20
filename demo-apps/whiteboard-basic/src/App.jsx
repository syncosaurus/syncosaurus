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

function Rectangle({ id, onShapePointerDown }) {
  const [props, setProps] = useState({
    x: getRandomInt(500),
    y: getRandomInt(500),
    fill: getRandomColor(),
  });
  const [selectedByMe, setSeletedByMe] = useState(false);
  const [selectedByOthers, setSeletedByOthers] = useState(false);

  const { x, y, fill } = props;
  console.log(x, y, fill);

  // const selectedByMe = useSelf(me => me.presence.selectedShape === id);
  // const selectedByOthers = useOthers(others =>
  //   others.some(other => other.presence.selectedShape === id)
  // );
  const selectionColor = selectedByMe
    ? 'blue'
    : selectedByOthers
    ? 'green'
    : 'transparent';

  return (
    <div
      onPointerDown={e => onShapePointerDown(e, id)}
      className={'rectangle'}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: !selectedByMe ? 'transform 120ms linear' : 'none',
        backgroundColor: fill || '#CCC',
        borderColor: selectionColor,
      }}
    />
  );
}

const COLORS = ['#DC2626', '#D97706', '#059669', '#7C3AED', '#DB2777'];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return COLORS[getRandomInt(COLORS.length)];
}

function Loading() {
  return (
    <div className={'container'}>
      <div className={'loading'}>
        <img src="https://liveblocks.io/loading.svg" alt="Loading" />
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Rectangle
        id={'a'}
        onShapePointerDown={() => console.log('clicked')}
      ></Rectangle>
      <Rectangle></Rectangle>
      <Rectangle></Rectangle>
    </>
  );
}

export default App;
