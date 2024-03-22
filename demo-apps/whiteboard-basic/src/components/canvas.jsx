import { useEffect, useState } from 'react';
import Rectangle from './rectangle';
import Syncosaurus from '../../../../syncosaurus/syncosaurus';
import {
  usePresence,
  useSubscribe,
  useUpdateMyPresence,
} from '../../../../syncosaurus/hooks';
import { mutators } from '../../../../syncosaurus/mutators.js';
import { v4 as uuidv4 } from 'uuid';
import Cursor from './cursor.jsx';

const rectangleColors = [
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

const cursorColors = [
  '#FF6EC7', // Hot pink
  '#7A4ED9', // Purple
  '#FFD700', // Gold
  '#00FFEE', // Cyan
  '#FF00FF', // Magenta
  '#FFA500', // Orange
  '#00FF00', // Neon green
  '#FF6347', // Tomato
  '#00FFFF', // Aqua
  '#FF1493', // Deep pink
];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomColor() {
  return rectangleColors[getRandomInt(rectangleColors.length)];
}

const getShapeIds = tx => tx.get('shapeIds');

const synco = new Syncosaurus({ mutators, userID: uuidv4() });

const Cursors = ({ synco }) => {
  const others = usePresence(synco);
  useUpdateMyPresence(synco);

  return (
    <>
      {Object.entries(others).map(([id, { x, y }], idx) => {
        return (
          <div
            key={id}
            className="cursorContainer"
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
          >
            <Cursor fill={cursorColors[idx]} />
          </div>
        );
      })}
    </>
  );
};

const Canvas = () => {
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  useUpdateMyPresence(synco);

  useEffect(() => {
    synco.launch('foooooooo');
  }, []);

  const shapeIds = useSubscribe(synco, getShapeIds, []);

  const handleShapePointerDown = (e, id) => {
    e.preventDefault(); // These e.preventDefaults stop text from being highlighted when the user clicks and holds/drags a rectangle
    setSelectedShapeId(id);
  };

  const handleCanvasPointerUp = () => {
    setSelectedShapeId(null);
  };

  const handleCanvasPointerMove = e => {
    if (!selectedShapeId) return;

    const x = Math.floor(e.clientX) - 54;
    const y = Math.floor(e.clientY) - 175;
    synco.mutate.modifyShape({ id: selectedShapeId, x, y });
  };

  const handleAddButtonClick = () => {
    synco.mutate.addShape({
      id: uuidv4(),
      x: getRandomInt(500),
      y: getRandomInt(500),
      fill: getRandomColor(),
    });
  };

  return (
    <>
      <Cursors synco={synco} />
      <button onClick={handleAddButtonClick}>Add shape</button>
      <p>Selected shape: {selectedShapeId && selectedShapeId.slice(0, 3)}</p>
      <p>Total shapes: {shapeIds.length}</p>
      <div
        className="canvas"
        onPointerUp={handleCanvasPointerUp}
        onPointerMove={handleCanvasPointerMove}
      >
        {shapeIds.map(id => (
          <Rectangle
            key={id}
            id={id}
            onShapePointerDown={handleShapePointerDown}
            synco={synco}
          />
        ))}
      </div>
    </>
  );
};

export default Canvas;
