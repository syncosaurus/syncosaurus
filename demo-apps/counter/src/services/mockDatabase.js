// TODO: this mockDB and mockDB query will eventually be behind an auth worker

// [roomName]:[roomID]
const roomObj = {
  franco: 'foo',
  joseph: 'bar',
  erik: 'baz',
  alex: 'qux',
};

export const mockDatabase = {
  async getRoomByName(roomName) {
    return roomObj[roomName];
  },

  async getAllRooms() {
    return roomObj;
  },
};
