import { mutators } from '../../frontend/src/utils/mutators.js';

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
    // This example refers to the same Durable Object instance since it hardcodes the name "foo".
    let id = env.WEBSOCKET_SERVER.idFromName('foo');
    let stub = env.WEBSOCKET_SERVER.get(id);

    return await stub.fetch(request);
  },
};

// Durable Object
export class WebSocketServer {
  constructor(state, env) {
    this.mutators = mutators;
    this.state = state;
    this.env = env;
    this.connections = [];
    this.latestTransactionByClientId = {};
    this.currentSnapshotID = 0;
    this.patch = [];
    this.presence = {
      // this is up to date information about who is currently connected / present
      // TODO make sure this is populated on connect and clients are removed on close
      a: { x: 75, y: 100 },
      b: { x: 10, y: 30 },
    };

    // `blockConcurrencyWhile()` ensures no requests are delivered until initialization completes.
    this.state.blockConcurrencyWhile(async () => {
      this.canon = (await this.state.storage.get('count')) || { count: 0 };
    });

    this.messageInterval = setInterval(
      () =>
        this.state.blockConcurrencyWhile(() => {
          const currentSnapshot = {
            snapshotID: this.currentSnapshotID,
            patch: this.patch,
            latestTransactionByClientId: this.latestTransactionByClientId,
            presence: this.presence,
          };

          const json = JSON.stringify(currentSnapshot);
          this.broadcast(json);

          this.currentSnapshotID += 1; // TODO convert to uulid?
          this.patch = [];
        }),
      1000
    );
  }

  broadcast(data) {
    this.connections.forEach(ws => ws.send(data));
  }

  // Handle HTTP requests from clients.
  async fetch(request) {
    if (request.url.endsWith('/websocket')) {
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
        const { transactionID, mutator, mutatorArgs, init, clientID } =
          JSON.parse(event.data);

        if (init) {
          const initState = { canonState: this.canon };
          server.send(JSON.stringify(initState));
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
        server.close(cls.code, 'Durable Object is closing WebSocket');
      });

      // CF input gates protect against unwanted concurrrency here
      await this.state.storage.put('count', this.canon);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  }
}
