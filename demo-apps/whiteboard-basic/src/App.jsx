import './App.css';
import './styles.css';

import { useState } from 'react';

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
        borderColor: 'charcoal',
        color: 'charcoal',
        boxShadow: '8px 9px 14px 0px rgba(0,0,0,0.37)',
        borderRadius: 10,
        padding: '5px',
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

    const x = Math.floor(e.clientX) - 50;
    const y = Math.floor(e.clientY) - 100;

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
