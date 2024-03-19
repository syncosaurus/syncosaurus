import { monotonicFactory } from 'ulidx';

const ulid = monotonicFactory();

export class Transaction {
  constructor(localState, notify, mutator, args, reason) {
    this.id = ulid(Date.now());
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
    delete this.localState[key];
  }
}
