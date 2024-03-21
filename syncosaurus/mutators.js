export const mutators = {
  increment,
  decrement,
  addShape,
};

//Mutators are async in replicache for startup: https://doc.replicache.dev/tutorial/adding-mutators
//2nd arg should look like {key: 'count', delta: 1}
async function increment(tx, { key, delta }) {
  console.log(`incrementing ${key} by ${delta}`);
  const prev = tx.get(key);
  const next = (prev ?? 0) + delta;
  tx.set(key, next);
}

async function decrement(tx, { key, delta }) {
  console.log(`decrementing ${key} by ${delta}`);
  const prev = tx.get(key);
  const next = (prev ?? 0) - delta;
  tx.set(key, next);
}

function addShape(tx, { id, x, y, fill }) {
  const prev = tx.get('shapeIds') || [];
  tx.set(id, { id, x, y, fill });
  tx.set('shapeIds', [...prev, id]);
  return { id, x, y, fill };
}
