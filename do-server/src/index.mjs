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
// Worker with Basic Room Encryption
// Test Entry:
// decryptionKey:  nDvnwoq/qrKCkBaXdHQ0riiXsT/80IrHmyiLqMeVYR4=
// ciphertext:  b6BUmmtioZh3Mm14q7pXAijuYQ==
// iv:  QHxgUtqF6PAPhiaQ
// decrypted text: foo

// current room URL shape: `http://my-collab-app.com/room/encryptedRoomID`
// excalidraw live session room URL shape: `http://my-collab-app.com/#room=encryptedRoomID`

// these eventually will be cloudflare env variables
const allowedOrigin = 'http://localhost:5173';
const KV_NAMESPACE = 'room_keys_2';

const getJWT = (request) => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer')) {
		return null;
	}

	return authHeader.substring(6).trim();
};

const verifyAuth = async (request) => {
  const token = getJWT(request) ?? "";

  const response = await fetch(`http://localhost:1337/verify?${token}`);
  return response;
}

export default {
	async fetch(request, env) {
		const { encryptSymmetric, decryptSymmetric, generateKey } = await import('./encrypt.js');
		let response;

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Credentials': 'true',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Origin': allowedOrigin,
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}

    const verifiedAuth = await verifyAuth(request);
    console.log(verifiedAuth);

    if (!verifiedAuth) {
      return new Response('Missing or Invalid Authenticaiton token', { status: 401 });
    }

		if (request.url.endsWith('syncosaurus') && request.method === 'POST') {
			const { newRoomName } = await request.json();
			const key = generateKey();
			const { ciphertext: encryptedRoomName, iv } = await encryptSymmetric(newRoomName, key);

			await env[KV_NAMESPACE].put(encryptedRoomName, JSON.stringify({ key, iv }));
			console.log(`'${encryptedRoomName}': ${await env[KV_NAMESPACE].get(encryptedRoomName)}`);
			response = Response.json({ encryptedRoomName });
			response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');

			return response;
		}

		if (request.url.endsWith('syncosaurus') && request.method === 'GET') {
			const { keys } = await env[KV_NAMESPACE].list();
			const encryptedRoomNameList = keys.map(({ name }) => name);

			response = Response.json({ encryptedRoomNameList });
			response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');

			return response;
		}

		const splitRoomsArr = (new URL(request.url)).pathname.split('room/');
		if (splitRoomsArr.length === 1) {
			return new Response(`Invalid Room URL: ${request.url}`, { status: 500 });
		}

		const encryptedRoomName = splitRoomsArr.at(-1);
		const encryptedRoomNameValue = await env[KV_NAMESPACE].get(encryptedRoomName);
    console.log(await env[KV_NAMESPACE].list());

		if (encryptedRoomNameValue) {
			const { key, iv } = JSON.parse(encryptedRoomNameValue);
			const decryptedRoomName = await decryptSymmetric(encryptedRoomName, iv, key);
			console.log(`RoomID found for encrypted string '${encryptedRoomName}': ${decryptedRoomName}`);

			const id = env.WEBSOCKET_SERVER.idFromName(decryptedRoomName);
			const stub = env.WEBSOCKET_SERVER.get(id);
			return await stub.fetch(request);
		} else {
			console.log(`The encrypted room '${encryptedRoomName}' does not correspond to any room names`);
			return new Response(`URL ${request.url} can not be found.`, { status: 404 });
		}
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
            updateType: 'delta',
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
      MSG_FREQUENCY
    );
  }

  broadcast(data) {
    this.connections.forEach(ws => ws.send(data));
  }

  // Handle HTTP requests from clients.
  // \/\/[^\/]+\/websocket
  async fetch(request) {
    if (request.url.match(/\/\/[^\/]+\/websocket/)) {
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
        delete this.presence[server.clientID];
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  }
}
