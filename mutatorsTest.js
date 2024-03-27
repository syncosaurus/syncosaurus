import { parse } from 'acorn';

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

const mutators = {
  increment,
  decrement,
  addTodo,
  removeTodo,
  addShape,
  modifyShape,
};

const validateMutators = mutators => {
  if (typeof mutators !== 'object') {
    return false;
  }

  for (let mutator in mutators) {
    const paramArr = parse(mutators[mutator], {
      ecmaVersion: 14,
    }).body[0].params.map(param => param.name);

    if (!(mutators[mutator] instanceof Function) || !paramArr.includes('tx')) {
      return false;
    }
  }

  return true;
};

console.log(validateMutators(mutators));
console.log(typeof mutators === 'object');
