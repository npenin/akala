import { map as mapAsync } from "../eachAsync.js";
import { Subscription } from "../teardown-manager.js";
import { Event, Listener } from "./shared.js";

/**
 * AsyncEvent class to manage asynchronous events.
 * @template T
 * @template TReturnType
 * @extends {Event<T, TReturnType | PromiseLike<TReturnType>>}
 */

export class AsyncEvent<T extends unknown[] = unknown[], TReturnType = void> extends Event<T, TReturnType | PromiseLike<TReturnType>>
{
    /**
     * Creates an instance of AsyncEvent.
     * @param {number} [maxListeners=10] - The maximum number of listeners.
     * @param {(args: TReturnType[]) => TReturnType} combineReturnTypes - Function to combine return types.
     */
    constructor(maxListeners: number = 10, combineReturnTypes: Event<T, TReturnType>['combineReturnTypes'] = null)
    {
        super(maxListeners, (promises) => Promise.all(promises).then((returns) => combineReturnTypes(returns)));
    }

    /**
     * Adds a listener to the asynchronous event.
     * @param {Listener<T, TReturnType | Promise<TReturnType>>} listener - The listener to add.
     * @param {{ once?: boolean }} [options] - The event options.
     * @returns {Subscription} - The subscription.
     */
    addListener(listener: Listener<T, TReturnType | PromiseLike<TReturnType>>, options?: { once?: boolean; }): Subscription
    {
        if (options?.once)
        {
            const stopListening = super.addListener(async (...args) =>
            {
                try
                {
                    return await listener(...args);
                }

                finally
                {
                    stopListening();
                }
            });
            return stopListening;
        }

        else
            return super.addListener(listener);
    }

    /**
     * Emits the asynchronous event.
     * @param {...T} args - The arguments to pass to the listeners.
     * @returns {Promise<TReturnType>} - The return value of the listeners.
     */
    async emit(...args: T): Promise<TReturnType>
    {
        return this.combineReturnTypes(await mapAsync(this.listeners, async (listener) => await listener(...args), true));
    }
}
