import { v4 as uuidv4 } from 'uuid';

export class Transaction {
  constructor(localState, notify, mutator, args, reason) {
    this.id = String(Date.now()) + '_' + uuidv4();
    this.localState = localState;
    this.notify = notify;
    this.mutator = mutator;
    this.mutatorArgs = args;
    this.reason = reason;
  }

  get(key) {
    return this.localState[key];
  }

  set(key, value) {
    if (this.reason === 'initial') {
      this.localState[key] = value; //update local KV
      this.notify(key, { ...this.localState }); //alert subscribers of change
    } else if (this.reason === 'replay') {
      this.localState[key] = value; //update local KV
    }
  }

  delete(key) {
    this.localState.delete(key);
  }
}
