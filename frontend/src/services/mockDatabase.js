
// TODO: this mockDB and mockDB query will eventually be behind an auth worker 

// [roomName]:[roomID]
const roomObj = {
  'counter-1': 'foo',
  'counter-2': 'bar',
  'counter-3': 'baz',
};

export const mockDatabase = {
  async getRoomByName(roomName) {
    return roomObj[roomName];
  }
};
