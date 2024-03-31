# Syncosaurus
Syncosaurus is a React-and-Javascript-based framework for building real-time, collaborative React applications backed by the Cloudflare edge network of Workers and Durable Objects. 

## Introduction
The Syncosaurus Framework consists of one or multiple clients and a server that shares a collaborative application state. Collectively, the clients who are connected to the server and the shared state between them make up what is known as a [room](#room). For each client, this state is stored in an in-memory key-value (KV) store database, and for the server, this state is stored in an in-memory key-value (KV) store database on a Cloudflare durable object, which also supports long-term persistent storage. The shared state across all these key-value stores is kept in sync in a strongly consistent, real-time manner. The framework ensures this strong consistency and real-time [syncing](#syncing) via an authoritative server model that is updated through [mutations](#mutators) sent by each client when a change is made to their respective local key-value store database. After processing each mutation, the server then sends back the authoritative state via [delta updates](#deltaupdates), which are then processed by each client to update their local state to match the server's state. Next, each client re-renders its state through [subscriptions and queries](#subscriptionqueries). This process is repeated each time a change to the state is made by any client. Additionally, the Syncosaurus framework supports sharing presence [presence](#presence) data which allows collaborating users to infer the of each other.

## Concepts
### <a name="room"></a>Room
A room is at the core of what makes an application collaborative. It is a collection of different clients (via websocket connections), a server, and a shared state (often referred to as a document in the context of some applications). With each instance of Syncosaurus, a client can access a single room at a time. The client can also switch between rooms if desired. It is up to the developer to keep track of the rooms in an external data store of their choice and implement the logic that allows a client to switch between rooms. 

### <a name="transactions"></a>Transactions
A transaction is a pre-defined class for interacting with the key-value store databases. The class consists of:
- methods that allow Mutators and Queries to update and read from the key-value store 
- metadata properties about when and how the local key-value store was interacted with

Technically, there are two transaction classes:
- `ReadTransaction` which has the following methods:
  - `get` - returns the value for the key from the local store based on a given key
  - `has` - returns true if a given key exists in the local store
  - `isEmpty` - returns true if the local store is empty
  - `scan` - returns an object containing a subset of KV pairs from the local store where a developer-defined callback evaluates to true
- `WriteTransaction` which has access to all of the `ReadTransaction` methods plus two others:
  - `set` - updates the value of a given key in the local store
  - `delete` - deletes a given key (and therefore value) from the local store

### <a name="mutators"></a>Mutators
Mutators are javascript developer-defined functions that define logic to update and manipulate the shared state based on user events in your application. A copy of the mutators is distributed to each client via your React application code and the server upon deployment through the Syncosaurus CLI. A mutator is first executed on the client side which updates its local key-value store and then later on the server-side counterpart, which also updates its own local key-value store. When a mutator is executed, a `WriteTransaction` instance, which gives the mutator function access to all predefined methods to manipulate the local store, is created. 

Here is an example mutator definition for a counter:
```javascript
async function increment(tx, { key, delta }) {
  const prev = tx.get(key);
  const next = (prev ?? 0) + delta;
  tx.set(key, next);
}
```
and its invocation in the React code based on a user clicking a button:
```javascript
const handleClick = (e) => {
  e.preventDefault()
  synco.mutate.increment({key: 'count', delta: 1})
}
```

### <a name="subscriptionqueries"></a>Subscriptions and Queries
A subscription is a custom React hook (`useSubscribe`) that uses the React `useState` hook under the hood to read data from the local store and re-render components when updates to the value(s) for a specific key or set of keys in the local storage occur. The key or set of keys that a subscription watches for updates to their values (aka a watchlist) are defined in the query argument of the `useSubscribe` hook. A query is a developer-defined function that defines the set of keys in the watchlist and it can also perform additional logic to transform the data before it is returned and re-rendered by the React code. When a query is executed, a `readTransaction` is created so any key provided to `has` or `get` or any of the keys returned by the `scan` method end up in the watchlist. Please note that `useSubscribe` takes two additional arguments, the `syncosaurus` instance and an initial state for the value (like the one provided to `useState` when using it directly in a React application).

Here is an example mutator definition for the same counter above:
```javascript
const count = useSubscribe(synco, (tx) => tx.get('count'), 0)
```

### <a name="syncing"></a>Syncing
When shared state is modified, it is kept in sync by a two-way communication process between each client and the server over a websocket connection. The process is as follows:
- A change to the shared state is initiated by a client via a mutator, which is first executed and applied to its local store
- The client then optimistically applies these updates by alerting the appropriate subscriptions which then re-render the UI
- A websocket message is then sent to the server which contains the name of the mutator and the arguments it was executed with
- The server executes the mutator locally and then generates an update message to convey the authoritative state. The message contains:
  - a `snapshotID` (used by clients to determine if they've missed an update)
  - a list of delta updates that occurred since the last message was sent (used by clients to bring their local store up to date with the server)
  - an array of the last mutation received from each client (used to remove any pending mutations)
- The server then broadcasts this message to all connected clients on a time-interval basis set by the developer
- Upon receiving the message, each client then applies the list delta updates to its local store since that is now the authoritative state
- Each client then reapplies any pending mutations it has already applied locally, but have not yet been acknowledged by the server
- Subscriptions are then alerted by each client to render the UI to reflect the authoritative state + any optimistic pending mutations

If for some reason, a client misses an update message or receives one out of order, it requests a full copy of the shared state from the server, known as a `reset`. This is a very similar process that happens when a client joins a room with pre-existing state.

### <a name="deltaupdates"></a>Delta Updates
Delta updates are a list of idempotent updates run by each client to bring it up to date with the server. Delta updates have two forms that correspond to the `WriteTransaction` write methods `set` and `delete`:
- `put` which informs a client to update the value of a certain key in its local store
- `del` which informs a client to remove the key (and therefore value) from its local store

### <a name="presence"></a>Presence
A key feature of collaborative applications is presence data which lets each user know who is collaborating on the document and their intent. In many web applications, this is often implemented by displaying avatars indicating who is currently looking at the document and/or displaying the cursors of other clients. Because the data for these features is ephemeral and inconsequential to the state of the application, it is treated differently than other state-related data in the Syncosaurus Framework.

## Implementing the Framework in your React Application
### Setup
@alex

### Adhere to file structure
@alex

### Configure application
@alex

### Define schema
Before building an application with the Syncosaurus Framework, it is imperative to define the schema of the key-value data store that backs the application. Do so enables clear requirements for mutators and subscriptions that are defined in subsequent steps.

### Define mutators
[Mutator functions](#mutators) must be defined in a file called `mutators.js` which is located in the `root/src` directory. The mutator file should export an object of the mutators so it can be provided when initiating the syncosaurus object in a later step. For example:
```javascript
//Mutators for a Todo List Application
export default {
  addTodo,
  removeTodo,
};

async function addTodo(tx, { id, text }) {
  const todo = { id, text, complete: false };
  await tx.set(`todo/${id}`, todo);
  return todo;
}

async function removeTodo(tx, { id }) {
  await tx.delete(`todo/${id}`);
}
```

When defining mutators, the first argument will be automatically provided by the Syncosaurus Framework so the developer does not have to define it. It will be a `WriteTransaction` class instance, which enables your mutator to utilize the following methods to interact with the local store:
- `get` - returns the value for the key from the local store based on a given key
- `has` - returns true if a given key exists in the local store
- `isEmpty` - returns true if the local store is empty
- `scan` - returns an object containing a subset of KV pairs from the local store where a developer-defined callback evaluates to true
- `set` - updates the value of a given key in the local store
- `delete` - deletes a given key (and therefore value) from the local store

The second argument is a JSON serializable object of the custom arguments provided to the mutator.  

Keep in mind that mutators must be idempotent since they are rerun on the server side and can be rerun on the client side when they are still in a pending state. In practice, this means that any identifier (and most randomly generated values) should be generated before invoking a mutator and then passed in as an argument (see todo list example above).

### Define authorization handler
@joseph

### Initialize Syncosaurus instance
@alex/@franco/@joseph

### Define logic to create a new room or join an existing room
@franco

### Define subscriptions
Subscriptions are defined directly in the React code of the application via the `useSubscribe` hook. The first argument of the `useSubscribe` hook will be the syncosaurus instance. This is used to provide the subscription with a `ReadTransaction` class instance, which enables your query to utilize the following methods to interact with the local store:
- `get` - returns the value for the key from the local store based on a given key
- `has` - returns true if a given key exists in the local store
- `isEmpty` - returns true if the local store is empty
- `scan` - returns an object containing a subset of KV pairs from the local store where a developer-defined callback evaluates to true

The second argument provided to `useSubscribe` is a query function defined by the developer. It is a callback that is executed when the keys from the local store that are involved in the query change, either from a mutation initiated on that client or an update from the server. Please note that a React re-render will only be triggered if the return value from the query has changed, which will avoid unnecessary rerenders. 

The third argument provided to `useSubscribe` is the initial value the application should display before receiving any initial updates from the server or any mutations affecting that subscription are executed.

Here is an example of a subscription for a todo list application that takes advantage of the `scan` method on a `ReadTransaction`:
```javascript
const todos = useSubscribe(
  synco,
  tx => {
    let todoObject = tx.scan(key => {
      return key.includes('todo');
    });
    return Object.values(todoObject);
  },
  []
);
```
Note that the callback provided to the `scan` method must return a boolean (or truthy / falsy value) based on the key and value for each key-value pair in the local store. This is what is used to determine which key-value pairs be included in the return object from `scan`.

### Define event handlers
Mutators are usually invoked via event handlers in the React code. To invoke a mutator, simply access the mutator on the syncosaurus instance and invoke it with the desired arguments. Here is an example to add and delete a todo from a todo list application:
```javascript
function handleSubmit(e) {
  e.preventDefault();
  synco.mutate.addTodo({
    id: uuidv4(),
    text: inputValue,
  });

  setInputValue('');
}

function handleDelete(id) {
  synco.mutate.removeTodo({ id });
}
```

### Add presence
@alex

### Deploy your backend
@alex / @joseph

### Deploy your frontend
@joseph


