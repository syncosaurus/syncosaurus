import { monotonicFactory } from 'ulidx';

const ulid = monotonicFactory();

export class ReadTransaction {
  constructor(localState, keysAccessed) {
    this.localState = localState;
    this.keysAccessed = keysAccessed;
  }

  get(key) {
    this.keysAccessed[key] = true;
    return this.localState[key];
  }

  has(key) {
    this.keysAccessed[key] = true;
    return Object.hasOwn(this.localState, key);
  }

  isEmpty() {
    return Object.keys(this.localState).length === 0;
  }
}

export class WriteTransaction extends ReadTransaction {
  constructor(localState, mutator, args, keysAccessed) {
    super(localState, keysAccessed);
    this.id = ulid(Date.now());
    this.mutator = mutator;
    this.mutatorArgs = args;
  }

  set(key, value) {
    this.localState[key] = value;
    this.keysAccessed[key] = true;
  }

  delete(key) {
    delete this.localState[key];
    this.keysAccessed[key] = true;
  }
}
