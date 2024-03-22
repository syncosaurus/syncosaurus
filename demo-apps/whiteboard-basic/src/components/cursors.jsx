import {
  usePresence,
  useUpdateMyPresence,
} from '../../../../syncosaurus/hooks';

import Cursor from './cursor';

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

export default Cursors;
