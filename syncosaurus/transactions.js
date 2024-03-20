import { monotonicFactory } from 'ulidx';

const ulid = monotonicFactory();

export class Transaction {
  constructor(localState, mutator, args, keysAccessed) {
    this.id = ulid(Date.now());
    this.localState = localState;
    this.mutator = mutator;
    this.mutatorArgs = args;
    this.keysAccessed = keysAccessed;
  }

  get(key) {
    this.keysAccessed[key] = true;
    return this.localState[key];
  }

  set(key, value) {
    this.localState[key] = value; //update local KV
    this.keysAccessed[key] = true;
  }

  delete(key) {
    delete this.localState[key];
    this.keysAccessed[key] = true;
  }
}

export class QueryTransaction {
  constructor(localState, keysAccessed) {
    this.localState = localState;
    this.keysAccessed = keysAccessed;
  }
  //get - returns the value for the key
  get(key) {
    this.keysAccessed[key] = true;
    return this.localState[key];
  }

  //has - returns true if the key exists
  has(key) {
    this.keysAccessed[key] = true;
    return Object.hasOwn(this.localState, key);
  }

  //isEmpty - returns true if the state is empty
  isEmpty() {
    return Object.keys(this.localState).length === 0;
  }

  //scan - to be implemented later, but returns an iterator, 
  //useful for getting or mutating multiple keys based on some criteria
}
