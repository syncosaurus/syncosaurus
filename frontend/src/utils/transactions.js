import { v4 as uuidv4 } from 'uuid';

export class Transaction {
  constructor(syncosaurus, mutator, args, reason) {
    this.transactionID = String(Date.now()) + '_' + uuidv4();
    this.syncosaurus = syncosaurus;
    this.mutator = mutator;
    this.mutatorArgs = args;
    this.reason = reason;
  }

  get(key) {
    return this.syncosaurus.localState[key];
  }

  set(key, value) {
    if (this.reason === 'initial') {
      this.syncosaurus.localState[key] = value; //update local KV

      this.syncosaurus.notify(key, { ...this.syncosaurus.localState }); //alert subscribers so that

      //send transaction to the server if this is the first time and not a replay
      this.syncosaurus.socket.send(
        JSON.stringify({
          transactionID: this.transactionID,
          mutator: this.mutator,
          mutatorArgs: this.mutatorArgs,
        })
      ); // send transactionId, mutator name, and arguments through websocket if the frist time
    } else if (this.reason === 'replay') {
      this.syncosaurus.localState[key] = value; //update local KV
    }
  }

  delete(key) {
    this.syncosaurus.localState.delete(key);
  }
}
