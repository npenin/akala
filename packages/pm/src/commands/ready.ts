import State, { RunningContainer } from '../state.js';

export default function ready(this: State, container: RunningContainer): void
{
    container.ready?.resolve();
}

exports.default.inject = ['$container']