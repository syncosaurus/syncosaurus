import { useState } from 'react';
import { useSubscribe } from '../../../../syncosaurus/hooks';

const Rectangle = ({ id, onShapePointerDown, synco }) => {
  const [selectedByMe, setSeletedByMe] = useState(false);
  const getShapeProps = tx => tx.get(id);
  const { x, y, fill } = useSubscribe(synco, getShapeProps, {});
  const handleShapePointerDown = e => {
    setSeletedByMe(true);
    onShapePointerDown(e, id);
  };

  console.log('rendering a rectangle. ID:', id);
  console.log(x, y, fill);
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
};

export default Rectangle;
