const Cursor = ({ fill }) => {
  return (
    <div>
      <svg
        fill="#000000"
        width="30px"
        height="30px"
        viewBox="0 0 24 24"
        id="cursor-up-left"
        data-name="Flat Color"
        xmlns="http://www.w3.org/2000/svg"
        className="icon flat-color"
      >
        <path
          id="primary"
          d="M20.8,9.4,4.87,2.18A2,2,0,0,0,2.18,4.87h0L9.4,20.8A2,2,0,0,0,11.27,22h.25a2.26,2.26,0,0,0,2-1.8l1.13-5.58,5.58-1.13a2.26,2.26,0,0,0,1.8-2A2,2,0,0,0,20.8,9.4Z"
          style={{ fill: fill || 'black' }}
        ></path>
      </svg>
    </div>
  );
};

export default Cursor;
