import { mutators } from '../../syncosaurus/mutators.js';

const MSG_FREQUENCY = 16;
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
    this.presence = {};
    this.canon = {};

    this.messageInterval = setInterval(
      () =>
        this.state.blockConcurrencyWhile(() => {
          const currentSnapshot = {
            snapshotID: this.currentSnapshotID,
            patch: this.patch,
            latestTransactionByClientId: this.latestTransactionByClientId,
            presence: this.presence,
          };

          console.log('canon', this.canon);
          const json = JSON.stringify(currentSnapshot);
          this.broadcast(json);

          this.currentSnapshotID += 1; // TODO convert to uulid?
          this.patch = [];
        }),
      MSG_FREQUENCY
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
        const {
          transactionID,
          mutator,
          mutatorArgs,
          init,
          clientID,
          presence,
        } = JSON.parse(event.data);

        if (init) {
          const initState = { canonState: this.canon };
          server.clientID = clientID;
          server.send(JSON.stringify(initState));
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
        delete this.presence[server.clientID];
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  }
}
