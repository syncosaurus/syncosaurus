import { monotonicFactory } from 'ulidx';

const ulid = monotonicFactory();

export class ReadTransaction {
  constructor(localState, keysAccessed, scanFlag) {
    this.localState = localState;
    this.keysAccessed = keysAccessed;
    this.scanFlag = scanFlag;
  }

  //returns the value for the key from local store
  get(key) {
    this.keysAccessed[key] = true;
    return this.localState[key];
  }

  //returns true if the key exists in local store
  has(key) {
    this.keysAccessed[key] = true;
    return Object.hasOwn(this.localState, key);
  }

  //returns true if the local store is empty
  isEmpty() {
    return Object.keys(this.localState).length === 0;
  }

  //returns an object containing KV pairs where developer callback evaluates to true
  scan(kvCallback) {
    let scanReturn = {};

    for (let key in this.localState) {
      if (kvCallback(key, this.localState[key])) {
        scanReturn[key] = this.localState[key];
      }
    }

    this.scanFlag['flag'] = true;

    return scanReturn;
  }
}

export class WriteTransaction extends ReadTransaction {
  constructor(localState, mutator, args, keysAccessed, scanFlag) {
    super(localState, keysAccessed, scanFlag);
    this.id = ulid(Date.now());
    this.mutator = mutator;
    this.mutatorArgs = args;
  }

  //update value of provided key in local store
  set(key, value) {
    this.localState[key] = value;
    this.keysAccessed[key] = true;
  }

  //delete given key from local store
  delete(key) {
    delete this.localState[key];
    this.keysAccessed[key] = true;
  }
}
