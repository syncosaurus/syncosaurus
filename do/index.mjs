class ServerTransaction {
  constructor(canon, transactionID, mutator, mutatorArgs, patch) {
    this.transactionID = transactionID;
    this.mutator = mutator;
    this.mutatorArgs = mutatorArgs;
    this.canon = canon;
    this.patch = patch;
  }

  get(key) {
    return this.canon[key];
  }

  has(key) {
    return Object.hasOwn(this.canon, key);
  }

  isEmpty() {
    return Object.keys(this.canon).length === 0;
  }

  scan(kvCallback) {
    let scanReturn = {};

    for (let key in this.localState) {
      if (kvCallback(key, this.localState[key])) {
        scanReturn[key] = this.localState[key];
      }
    }

    return scanReturn;
  }

  set(key, value) {
    this.canon[key] = value;

    this.patch.push({
      op: 'put',
      key,
      value,
    });
  }

  delete(key) {
    delete this.canon[key];

    this.patch.push({
      op: 'del',
      key,
    });
  }
}

// Worker
export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
          'Access-Control-Allow-Headers':
            request.headers.get('Access-Control-Request-Headers') || '',
        },
      });
    }

    const url = new URL(request.url);
    const urlParams = url.searchParams;
    const auth = urlParams.get('auth');
    const room = urlParams.get('room');
    let authHandler;

    // If auth token exists, try to import authHandler function
    if (auth) {
      try {
        const importedObj = await import('../src/authHandler.js');
        authHandler = importedObj instanceof Function ? importedObj : null;
      } catch (error) {
        console.error(`Error importing authHandler from 'authHandler.js': ${error}`);
      }
    }

    // If authHandler and auth both are valid, invoke the authentication handler
    if (auth && authHandler) {
      try {
        await authHandler(auth);
      } catch (error) {
        return new Response('Missing or invalid authentication token', {
          status: 401,
        });
      }
    }

    const id = env.SYNCOSAURUS_WEBSOCKET_SERVER.idFromName(room);
    const stub = env.SYNCOSAURUS_WEBSOCKET_SERVER.get(id);
    return await stub.fetch(request);
  },
};

// Durable Object
export class WebSocketServer {
  constructor(state, env) {
    this.MSG_FREQUENCY = env.MSG_FREQUENCY;
    this.state = state;
    this.storage = this.state.storage;
    this.env = env;
    this.connections = [];
    this.latestTransactionByClientId = {};
    this.currentSnapshotID = 0;
    this.patch = [];
    this.presence = {};
    this.canon = {};

    // Guard against invalid mutators.js module and import errors when initializing mutators
    this.state.blockConcurrencyWhile(async() => {
      try {
        this.mutators = await import('../src/mutators.js');
      } catch(error) {
        this.mutators = {};
        console.error(`Mutators failed to be imported correctly: ${error}`);
      }
    });

    this.messageInterval = setInterval(
      () =>
        this.state.blockConcurrencyWhile(() => {
          const currentSnapshot = {
            updateType: 'delta',
            snapshotID: this.currentSnapshotID,
            patch: this.patch,
            latestTransactionByClientId: this.latestTransactionByClientId,
            presence: this.presence,
          };

          const json = JSON.stringify(currentSnapshot);
          this.broadcast(json);

          this.currentSnapshotID += 1;
          this.patch = [];
        }),
      this.MSG_FREQUENCY
    );

    // Conditional check for storage dependent logic
    if (env.USE_STORAGE) {
      this.loadStorage();
      this.autosaveInterval = setInterval(() => {
        this.storage.put('canon', { ...this.canon });
        console.log('autosaving');
      }, env.AUTOSAVE_INTERVAL);
    } else {
      console.log('not using storage');
    }
  }

  async loadStorage() {
    this.canon = await this.storage.get('canon');
    if (this.canon === undefined) {
      this.canon = {};
    }
  }

  broadcast(data) {
    this.connections.forEach(ws => ws.send(data));
  }

  // Handle HTTP requests
  async fetch(request) {
    // Check for correct `Upgrade` header during initial HTTP request
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Durable Object expected Upgrade: websocket', {
        status: 426,
      });
    }

    // Creates two ends of a WebSocket connection.
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    server.accept();
    this.connections.push(server);

    server.addEventListener('message', event => {
      const {
        transactionID,
        mutator,
        mutatorArgs,
        init,
        clientID,
        presence,
        reset,
      } = JSON.parse(event.data);

      if (init) {
        const initState = {
          updateType: 'init',
          snapshotID: this.currentSnapshotID - 1,
          canonState: this.canon,
        };
        server.clientID = clientID;
        server.send(JSON.stringify(initState));
        return;
      }

      if (reset) {
        const resetState = {
          updateType: 'reset',
          snapshotID: this.currentSnapshotID - 1,
          canonState: this.canon,
        };
        server.send(JSON.stringify(resetState));
        return;
      }

      if (presence) {
        this.presence[clientID] = presence;
        return;
      }

      const canonTx = new ServerTransaction(
        this.canon,
        transactionID,
        mutator,
        mutatorArgs,
        this.patch
      );

      this.mutators[mutator](canonTx, mutatorArgs);

      if (transactionID) {
        this.latestTransactionByClientId[clientID] = transactionID;
      }
    });

    server.addEventListener('close', async cls => {
      this.connections = this.connections.filter(ws => ws !== server);

      if (this.autosaveInterval && this.connections.length === 0) {
        // This executes if autosave is in use, and the just disconnected WS is the last one
        console.log('Last websocket disconnected. Saving state.');
        this.storage.put('canon', { ...this.canon });
      }
      delete this.presence[server.clientID];
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
