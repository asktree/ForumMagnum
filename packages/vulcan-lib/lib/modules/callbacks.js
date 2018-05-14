import { debug } from './debug.js';
import { Utils } from './utils';

/**
 * @summary A list of all registered callback hooks
 */
export const CallbackHooks = [];

/**
 * @summary Callback hooks provide an easy way to add extra steps to common operations.
 * @namespace Callbacks
 */
export const Callbacks = {};


/**
 * @summary Register a callback
 * @param {String} hook - The name of the hook
 * @param {Function} callback - The callback function
 */
export const registerCallback = function (callback) {
  CallbackHooks.push(callback);
};

/**
 * @summary Add a callback function to a hook
 * @param {String} hook - The name of the hook
 * @param {Function} callback - The callback function
 */
export const addCallback = function (hook, callback) {

  if (!callback.name) {
    // eslint-disable-next-line no-console
    console.log(`// Warning! You are adding an unnamed callback to ${hook}. Please use the function foo () {} syntax.`);
  }

  // if callback array doesn't exist yet, initialize it
  if (typeof Callbacks[hook] === "undefined") {
    Callbacks[hook] = [];
  }

  Callbacks[hook].push(callback);
};

/**
 * @summary Remove a callback from a hook
 * @param {string} hook - The name of the hook
 * @param {string} functionName - The name of the function to remove
 */
export const removeCallback = function (hookName, callbackName) {
  Callbacks[hookName] = _.reject(Callbacks[hookName], function (callback) {
    return callback.name === callbackName;
  });
};

/**
 * @summary Successively run all of a hook's callbacks on an item
 * @param {String} hook - First argument: the name of the hook
 * @param {Any|Promise<Any>} item - Second argument: the post, comment, modifier, etc. on which to run the callbacks
 * @param {Any} args - Other arguments will be passed to each successive iteration
 * @returns {Any|Promise<Any>} Returns the item after it's been through all the callbacks for this hook
 */
export const runCallbacks = function () {

  // the first argument is the name of the hook or an array of functions
  const hook = arguments[0];
  // find registered hook
  const registeredHook = CallbackHooks.find(({ name }) => name === hook);
  // the second argument is the item on which to iterate; wrap it with promise if hook is async
  const item = registeredHook && registeredHook.runs === 'async'
    ? Promise.resolve(arguments[1])
    : arguments[1];
  // successive arguments are passed to each iteration
  const args = Array.prototype.slice.call(arguments).slice(2);
  // flag used to detect the callback that initiated the async context
  let asyncContext = Utils.isPromise(item);

  const callbacks = Array.isArray(hook) ? hook : Callbacks[hook];

  if (typeof callbacks !== "undefined" && !!callbacks.length) { // if the hook exists, and contains callbacks to run

    const runCallback = (accumulator, callback) => {
      debug(`\x1b[32m>> Running callback [${callback.name}] on hook [${hook}]\x1b[0m`);
      const newArguments = [accumulator].concat(args);

      try {
        const result = callback.apply(this, newArguments);

        // if callback is only supposed to run once, remove it
        if (callback.runOnce) {
          removeCallback(hook, callback.name);
        }

        if (typeof result === 'undefined') {
          // if result of current iteration is undefined, don't pass it on
          // debug(`// Warning: Sync callback [${callback.name}] in hook [${hook}] didn't return a result!`)
          return accumulator;
        } else if (Utils.isPromise(result)) {
          if (registeredHook && registeredHook.runs === 'sync') {
            console.log(`// Warning! Async callback [${callback.name}] executed in sync hook [${hook}], its value is being skipped.`);
            return accumulator;
          } else if (!asyncContext) {
            debug(`\x1b[32m>> Started async context in hook [${hook}] by [${callback.name}]\x1b[0m`);
            asyncContext = true;
          }
        }
        return result;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`\x1b[31m// error at callback [${callback.name}] in hook [${hook}]\x1b[0m`);
        // eslint-disable-next-line no-console
        console.log(error);
        if (error.break || error.data && error.data.break) {
          throw error;
        }
        // pass the unchanged accumulator to the next iteration of the loop
        return accumulator;
      }
    };

    return callbacks.reduce(function (accumulator, callback) {
      if (Utils.isPromise(accumulator)) {
        return new Promise((resolve, reject) => {
          accumulator
            .then(result => {
              try {
                // run this callback once we have the previous value
                resolve(runCallback(result, callback));
              } catch (error) {
                // error will be thrown only for breaking errors, so throw it up in the promise chain
                reject(error);
              }
            })
            .catch(reject);
        });
      } else {
        return runCallback(accumulator, callback);
      }
    }, item);

  } else { // else, just return the item unchanged
    return item;
  }
};

/**
 * @summary Run all of a hook's callbacks on an item in parallel (only works on server)
 * @param {String} hook - First argument: the name of the hook
 * @param {Any} args - Other arguments will be passed to each callback
 * @return {Promise<Object>} Callbacks results keyed by callbacks names
 */
export const runCallbacksAsync = async function() {

  // the first argument is the name of the hook or an array of functions
  var hook = arguments[0];
  // successive arguments are passed to each iteration
  var args = Array.prototype.slice.call(arguments).slice(1);

  const callbacks = Array.isArray(hook) ? hook : Callbacks[hook];

  if (Meteor.isServer && typeof callbacks !== "undefined" && !!callbacks.length) {

    const results = await Promise.all(
      callbacks.map(callback => {
        debug(`\x1b[32m>> Running async callback [${callback.name}] on hook [${hook}]\x1b[0m`);
        return callback.apply(this, args);
      }),
    );
    return results.reduce(
      (accumulator, result, index) => ({ ...accumulator, [callbacks[index].name]: result }),
      {},
    );
  }

};