// error validation here

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
    if (!(mutators[mutator] instanceof Function)) {
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
  } else if (!validateUrl(options.server)) {
    throw new Error(`The server URL '${options.server} is not valid`);
  } else if (!validateMutators(options.mutators)) {
    throw new Error(
      "Mutators must all be functions, and all must have 'tx' as their first parameter"
    );
  }
};

export { validateSyncosaurusOptions };
