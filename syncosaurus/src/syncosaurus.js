import { WriteTransaction, ReadTransaction } from './transactions.js';
import { validateSyncosaurusOptions } from './utils/utils.js';
import { nanoid } from 'nanoid';

export default class Syncosaurus {
  constructor({ mutators, userID, server, auth }) {
    validateSyncosaurusOptions({ mutators, server });
    this.localState = {};
    this.txQueue = [];
    this.presenceConnection;
    this.prevServerSnapshot = null;
    this.subscriptions = [];
    this.userID = userID || nanoid();
    this.server = server;
    this.auth = auth;
    this.mutators = mutators;
    this.initializeMutators();
  }

  subscribe(query, callback) {
    let queryTransaction = new ReadTransaction(this.localState);
    let queryResult = query(queryTransaction);
    let scanFlag = queryTransaction.scanFlag;
    let subscriptionInfo = {
      scanFlag,
      keys: queryTransaction.keysAccessed,
      query,
      prevResult: queryResult,
      callback,
    };

    this.subscriptions.push(subscriptionInfo);
    if (queryResult) {
      callback(queryResult);
    }
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
        //If the current key is in the subscription "watch list" called `keys` or the subscription contains a scan
        // and the subscription has not already been run, re-run the query
        if (
          (subscription.keys[notificationKey] || subscription.scanFlag) &&
          !executedSubscriptions[subIdx]
        ) {
          let queryTransaction = new ReadTransaction(this.localState);
          let queryResult = subscription.query(queryTransaction);
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

  // Before initializing websocket connection, check for any authentication reqs
  async launch(roomID) {
    if (!roomID) {
      throw new Error('roomID must be provided when launching Syncosaurus');
    }
    this.setRoomID(roomID);
    this.initializeWebsocket(roomID);
  }

  setRoomID(roomID) {
    this.roomID = roomID;
  }

  hasLiveWebsocket() {
    if (!this.socket) {
      return false;
    }

    return this.socket.readyState === 0 || this.socket.readyState === 1;
  }

  initializeWebsocket(roomID) {
    // Create a room URL with or without an auth header
    const roomUrl = this.auth
      ? `${this.server}?auth=${auth}&room=${roomID}`
      : `${this.server}?room=${roomID}`;
    // establish websocket connection with CF worker
    this.socket = new WebSocket(roomUrl);

    // wait for socket to open before accepting messages
    this.socket.addEventListener('open', () => {
      this.socket.send(JSON.stringify({ init: true, clientID: this.userID }));
    });

    //When message received from websocket, update canon state and re-run pending mutations
    this.socket.addEventListener('message', event => {
      //parse websocket response
      const {
        updateType,
        latestTransactionByClientId,
        snapshotID,
        patch,
        canonState,
        presence,
      } = JSON.parse(event.data);

      //initial state is received
      if (updateType === 'init') {
        this.prevServerSnapshot = snapshotID;
        this.localState = canonState;
        this.notifyList(Object.keys(this.localState));
        return;
        //reset event is received - may be able to optimize this logic later
      } else if (updateType === 'reset') {
        this.prevServerSnapshot = snapshotID;
        this.localState = canonState;
        this.notifyList(Object.keys(this.localState));
        return;
        //check to see if reset is needed because we are missing one delta
      } else if (
        updateType === 'delta' &&
        snapshotID - this.prevServerSnapshot > 1 &&
        this.socket.readyState === 1
      ) {
        this.socket.send(JSON.stringify({ reset: true }));
        //no need to apply update locally because it will be encompassed when next init arrives
        return;
      }

      this.prevServerSnapshot = snapshotID;

      //remove pending events from queue if they occured before latestTransactionByClientId
      this.txQueue = this.txQueue.filter(
        tx => tx.id > latestTransactionByClientId[this.userID]
      );

      if (patch && patch.length > 0) {
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

        //update subscribers
        this.notifyList(notificationKeyArray);
      }

      // This checks if the presenceConnection exists on the app
      // If the client app doesn't ever use the usePresence hook, this block is always ignored
      if (presence && this.presenceConnection) {
        delete presence[this.userID];
        this.presenceConnection(presence);
      }
    });
  }

  initializeMutators() {
    //The new mutators will be run with a new transaction instance with prefilled
    //so everytime it's called it creates a new transaction and adds it to the queue and the
    //kvStore
    this.mutate = {};
    this.replayMutate = {};
    for (let mutator in this.mutators) {
      this.mutate[mutator] = args => {
        const transaction = new WriteTransaction(
          this.localState,
          mutator,
          args
        );
        this.txQueue.push(transaction);
        this.mutators[mutator](transaction, args); //execute mutator on local state
        this.notifyList(Object.keys(transaction.keysAccessed)); //notify subscribers

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
        const transaction = new WriteTransaction(
          this.localState,
          mutator,
          args
        );
        this.mutators[mutator](transaction, args);
      };
    }
  }
}
