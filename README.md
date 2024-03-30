# Syncosaurus
Syncosaurus is a React-and-Javascript-based framework for building real-time, collaborative React applications backed by the Cloudflare edge network of Workers and Durable Objects. 

## Introduction
The Syncosaurus Framework consists of one or multiple clients and a server that shares a collaborative application state. For each client, this state is stored in an in-memory key-value (KV) store database, and for the server, this state is stored in an in-memory key-value (KV) store database on a Cloudflare durable object, which also supports long-term persistent storage. The shared state across all these key-value stores is kept in sync in a strongly consistent, real-time manner. The framework ensures this strong consistency and real-time syncing via an authoritative server model that is updated through "mutations" sent by each client when a change is made to their respective local key-value store database. After processing each mutation, the server then sends back the authoritative state via "delta updates", which are then processed by each client to update their local state to match the server's state. Next, each client re-renders its state through "queries and subscriptions". This process is repeated each time a change to the state is made by any client.

## Concepts
### Transactions
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

### Mutators
Mutators are javascript developer-defined functions that define logic to update and manipulate the shared state based on user events in your application. A copy of the mutators is distributed to each client via your React application code and the server upon deployment through the Syncosaurus CLI. A mutator is first executed on the client side which updates its local key-value store and then later on the server-side counterpart, which also updates its own local key-value store. When a mutator is executed, a transaction instance, which gives the mutator function access to several predefined methods to manipulate the local store, is created. 

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


### Queries and subscriptions

### Delta Updates and syncing

### Presence
A key feature of collaborative applications is presence data which lets each user know who is collaborating on the document and their intent. In many web applications, this is implemented as avatars indicating who is currently looking at the document and/or cursors. Because the data for these features is ephemeral and inconsequential to the state of the application, it is treated differently than other state-related data.

## Setup and Structure


### Using the Framework

### 1. Define your mutators

### 2. Initialize your Syncosaurus instance in your React application

### 3. Create any subscriptions required for shared state

### 4. Add presence support



