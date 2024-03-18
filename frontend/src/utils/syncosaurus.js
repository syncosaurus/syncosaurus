import { Transaction } from './transactions';

export default class Syncosaurus {
  constructor(options) {
    //create client side KV stores
    this.localState = {}; //create a KV store instance for the syncosaurus client that serves as UI display
    this.canonState = {}; //create a KV store instance for the syncosaurus client that serves as source of truth after server runs
    this.txQueue = []; // create a tx

    // establish websocket connection with DO
    this.socket = new WebSocket('ws://localhost:8787/websocket');

    //When message received from websocket, update canon state and re-run pending mutations
    this.socket.addEventListener('message', event => {
      //parse websocket response
      const response = JSON.parse(event.data);

      //remove pending event from queue
      this.txQueue = this.txQueue.filter(
        tx => tx.id !== response.transactionID
      );

      //update cannon and cannon clone to be the result from the server
      for (let key in response.canonState) {
        // replace canonCloneState with canonState
        this.canonState[key] = response.canonState[key];
        this.localState[key] = response.canonState[key]; //reset canonClone to be same as canon
      }
      console.log('--------------New Response---------------------');
      console.log('canon state', this.canonState);
      console.log('local state', this.localState);

      //re-run any pending mutations on top of canonClone to produce the new localState
      this.txQueue.forEach(tx => {
        this.replayMutate[tx.mutator](tx.mutatorArgs);
      });
      console.log('--------------After Mutation Replay---------------------');
      console.log('local state', this.localState);

      //update
      this.notify('count', { ...this.localState });
    });

    this.socket.addEventListener('open', () => {
      console.log('connection opened');
      this.socket.send(JSON.stringify({ init: true }));
    });

    //The new mutators will be run with a new transaction instance with prefilled
    //so everytime it's called it creates a new transaction and adds it to the queue and the
    //kvStore
    const { mutators } = options;
    this.mutate = {};
    this.replayMutate = {};
    for (let mutator in mutators) {
      this.mutate[mutator] = args => {
        const transaction = new Transaction(this.localState, this.notify.bind(this), mutator, args, 'initial');
        this.txQueue.push(transaction);
        mutators[mutator](transaction, args); //execute mutator on local state
        //send transaction to the server if this is the first time and not a replay
        this.socket.send(
          JSON.stringify({
            transactionID: transaction.id,
            mutator: mutator,
            mutatorArgs: args,
          })
        );
        console.log('local state', this.localState);
      };

      this.replayMutate[mutator] = args => {
        const transaction = new Transaction(this.localState, this.notify.bind(this), mutator, args, 'replay');
        mutators[mutator](transaction, args);
      };
    }
    /*


      }

    */

    this.subscriptions = {};
  }
  // query | tx => tx.get('count') but for now i'm using 'count'
  // callback | newData => {setData(newData)});
  subscribe(query, callback) {
    if (!this.subscriptions[query]) {
      this.subscriptions[query] = [];
    }
    this.subscriptions[query].push(callback);
    // Return a function to unsubscribe from the query
    return () => {
      this.unsubscribe(query, callback);
    };
  }

  unsubscribe(query, callback) {
    if (this.subscriptions[query]) {
      this.subscriptions[query] = this.subscriptions[query].filter(
        cb => cb !== callback
      );
    }
  }

  notify(query, newData) {
    if (this.subscriptions[query]) {
      this.subscriptions[query].forEach(callback => {
        callback(newData);
      });
    }
  }
}
