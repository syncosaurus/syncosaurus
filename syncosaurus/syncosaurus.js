import { Transaction, QueryTransaction } from './transactions';

export default class Syncosaurus {
  constructor(options) {
    //create client side KV stores
    this.localState = {}; //create a KV store instance for the syncosaurus client that serves as UI display
    this.txQueue = []; // create a tx
    this.userID = options.userID;
    this.presenceConnection;

    // establish websocket connection with DO
    this.socket = new WebSocket('ws://localhost:8787/websocket');

    //When message received from websocket, update canon state and re-run pending mutations
    this.socket.addEventListener('message', event => {
      //parse websocket response
      const {
        latestTransactionByClientId,
        snapshotID,
        patch,
        canonState,
        presence,
      } = JSON.parse(event.data);

      if (canonState) {
        this.localState = canonState;
        this.notifyList(Object.keys(this.localState));
        return;
      }

      //remove pending events from queue if they occured before latestTransactionByClientId
      this.txQueue = this.txQueue.filter(
        tx => tx.id > latestTransactionByClientId[this.userID]
      );

      let notificationKeyArray = [];
      //iterate through patch updates and run them on local state
      patch.forEach(operation => {
        if (operation.op === 'put') {
          this.localState[operation.key] = operation.value;
        } else if (operation.op === 'del') {
          delete this.localState[operation.key];
        } else if (operation.op === 'clear') {
          this.localState = {};
        }

        notificationKeyArray.push(operation.key);
      });

      //re-run any pending mutations on top of canonClone to produce the new localState
      this.txQueue.forEach(tx => {
        this.replayMutate[tx.mutator](tx.mutatorArgs);
      });

      //update
      this.notifyList(notificationKeyArray);
      // This checks if the presenceConnection exists on the app
      // If the client app doesn't ever use the usePresence hook, this block is always ignored
      if (presence && this.presenceConnection) {
        delete presence[this.userID];
        this.presenceConnection(presence);
      }
    });

    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({ init: true, clientID: this.userID }));
    });

    //The new mutators will be run with a new transaction instance with prefilled
    //so everytime it's called it creates a new transaction and adds it to the queue and the
    //kvStore
    const { mutators } = options;
    this.mutate = {};
    this.replayMutate = {};
    for (let mutator in mutators) {
      this.mutate[mutator] = args => {
        let subKeys = {};
        const transaction = new Transaction(
          this.localState,
          mutator,
          args,
          subKeys
        );
        this.txQueue.push(transaction);
        mutators[mutator](transaction, args); //execute mutator on local state
        this.notifyList(Object.keys(subKeys)); //notify subscribers

        //send transaction to the server if this is the first time and not a replay
        this.socket.send(
          JSON.stringify({
            transactionID: transaction.id,
            mutator: mutator,
            mutatorArgs: args,
            clientID: this.userID,
          })
        );
      };

      this.replayMutate[mutator] = args => {
        let subKeys = {};
        const transaction = new Transaction(
          this.localState,
          mutator,
          args,
          subKeys
        );
        mutators[mutator](transaction, args);
      };
    }

    this.subscriptions = [];
  }

  subscribe(query, callback) {
    let subKeys = {};
    let queryTransaction = new QueryTransaction(this.localState, subKeys);
    let queryResult = query(queryTransaction);
    let subscriptionInfo = {
      keys: subKeys,
      query: query,
      prevResult: queryResult,
      callback,
    };

    this.subscriptions.push(subscriptionInfo);

    // Return a function to unsubscribe from the query when component is unmounted
    return () => {
      this.unsubscribe(query);
    };
  }

  //remove subscription with matching query from the array of subscriptions
  unsubscribe(query) {
    this.subscriptions = this.subscriptions.filter(subscription => {
      //return false if it is the subscription we want to remove, otherwise true
      return !(subscription.query === query);
    });
  }

  //takes a list of keys and notifies their subscribers
  notifyList(notificationKeys) {
    let executedSubscriptions = {};

    //iterate through each key updated and if there is a subscription that relies on it, notify the subscriber so
    //they can rerender the component
    notificationKeys.forEach(notificationKey => {
      this.subscriptions.forEach((subscription, subIdx) => {
        //If the current key is in the subscription "watch list" called `keys` and the subscription has not already been run,
        //re-run the query

        if (
          subscription.keys[notificationKey] &&
          !executedSubscriptions[subIdx]
        ) {
          let newSubKeys = {};
          let queryTransaction = new QueryTransaction(
            this.localState,
            newSubKeys
          );
          let queryResult = subscription.query(queryTransaction, newSubKeys);
          //If the query results have changed, invoke the callback (setState react function)
          //for the subscriber, otherwise don't
          if (
            typeof queryResult === 'object' &&
            !(
              JSON.stringify(queryResult) ===
              JSON.stringify(subscription.prevResult)
            )
          ) {
            subscription.prevResult = queryResult;
            subscription.callback(queryResult);
          } else if (!(queryResult === subscription.prevResult)) {
            subscription.prevResult = queryResult;
            subscription.callback(queryResult);
          }

          //Reset keys in the case of `scan` method which can change keys that a subscriber pays attention to
          subscription.keys = newSubKeys;

          //add the exectued subscription index to the object so we don't notify the subscriber twice
          executedSubscriptions[subIdx] = true;
        }
      });
    });
  }

  subscribePresence(callback) {
    this.presenceConnection = callback;
  }

  updateMyPresence(newData) {
    const payload = { presence: newData, clientID: this.userID };
    const msg = JSON.stringify(payload);
    this.socket.send(msg);
  }
}
