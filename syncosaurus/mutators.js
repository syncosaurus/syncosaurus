export const mutators = {
  increment,
  decrement,
  addTodo,
  removeTodo,
  addShape,
  modifyShape,
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


//Mutators for the Todo Application
async function addTodo(tx, { id, text }) {
  const todo = { id, text, complete: false };
  await tx.set(`todo/${id}`, todo);
  return todo;
}

async function removeTodo(tx, { id }) {
  await tx.delete(`todo/${id}`);
}

function addShape(tx, { id, x, y, fill }) {
  const prev = tx.get('shapeIds') || [];
  tx.set(id, { id, x, y, fill });
  tx.set('shapeIds', [...prev, id]);
  return { id, x, y, fill };
}

function modifyShape(tx, args) {
  const { id, ...changes } = args;
  const prev = tx.get(id);
  const next = { ...prev, ...changes };
  tx.set(id, next);

}
