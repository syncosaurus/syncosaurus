import { useState } from 'react';
import { useSubscribe } from '../../../../syncosaurus/hooks';

const Rectangle = ({ id, onShapePointerDown, synco }) => {
  const [selectedByMe, setSeletedByMe] = useState(false);

  const getShapeProps = tx => tx.get(id);
  const shapeProps = useSubscribe(synco, getShapeProps, {});
  const { x, y, fill } = shapeProps;

  const handleShapePointerDown = e => {
    setSeletedByMe(true);
    onShapePointerDown(e, id);
  };

  if (x === undefined || y === undefined || fill === undefined) {
    return;
  }
  return (
    <div
      onPointerDown={handleShapePointerDown}
      className={'rectangle'}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        backgroundColor: fill || '#CCC',
      }}
    >
      {id.slice(0, 3)}
    </div>
  );
};

export default Rectangle;
