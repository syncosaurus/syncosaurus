// error validation here
import { parse } from 'acorn';
import mutators from './mutators';

const validateUrl = url => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
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
const validateSyncosaurusOptions = options => {
  if (!options.server) {
    throw new Error(
      'A server URL must be provided when instantiating Syncosaurus'
    );
  } else if (!validateUrl(server)) {
    throw new Error(`The server URL '${options.server} is not valid`);
  } else if (!validateMutators(mutators)) {
    throw new Error(
      "Mutators must all be functions, and all must have 'tx' as their first parameter"
    );
  }
};

export default { validateSyncosaurusOptions };
