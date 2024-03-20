import { v4 as uuidv4 } from 'uuid';

export class User {
  constructor() {
    this.id = uuidv4();
  }
}
