import { mutators } from '../../frontend/src/utils/mutators.js';

class ServerTransaction {
  constructor(canon, transactionID, mutatorArgs) {
    this.transactionID = transactionID;
    this.mutatorArgs = mutatorArgs;
    this.canon = canon;
  }

  get(key) {
    return this.canon[key];
  }

  set(key, value) {
    this.canon[key] = value;
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
    this.state = state;
    this.env = env;
    this.connections = [];
    this.clientIDs = {};

    // `blockConcurrencyWhile()` ensures no requests are delivered until initialization completes.
    this.state.blockConcurrencyWhile(async () => {
      console.log(await this.state.storage.get('count'));
      this.canon = (await this.state.storage.get('count')) || { count: 0 };
    });
    this.mutators = mutators;
    console.log(this.mutators);
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
        const { transactionID, mutator, mutatorArgs, init } = JSON.parse(
          event.data
        );

        if (init) {
          const initState = { canonState: this.canon };
          server.send(JSON.stringify(initState));
          return;
        }

        const canonTx = new ServerTransaction(
          this.canon,
          transactionID,
          mutator,
          mutatorArgs
        );
        this.mutators[mutator](canonTx, mutatorArgs);
        const canonUpdate = { transactionID, canonState: this.canon }; // TODO fix these variable names
        this.broadcast(JSON.stringify(canonUpdate));
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
