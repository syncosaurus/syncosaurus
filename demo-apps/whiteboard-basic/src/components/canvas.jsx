import { useState } from 'react';
import Rectangle from './rectangle';
import Syncosaurus from '../../../../syncosaurus/syncosaurus';
import { useSubscribe } from '../../../../syncosaurus/hooks';
import { mutators } from '../../../../syncosaurus/mutators.js';
import { v4 as uuidv4 } from 'uuid';

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

const synco = new Syncosaurus({ mutators, userID: 'alex' });

const getShapeIds = tx => tx.get('shapeIds');

const Canvas = () => {
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  // const [shapes, setShapes] = useState(mockShapes);

  const shapeIds = useSubscribe(synco, getShapeIds, []);

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
      <button onClick={handleAddButtonClick}>Add shape</button>
      <p>Selected shape: {selectedShapeId}</p>
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
