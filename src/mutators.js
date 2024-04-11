// Mutators are defined here in ./src/mutators.js
export default {
  increment,
  decrement
};

//Mutators for the counter application
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
