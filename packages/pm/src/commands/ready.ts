import State, { RunningContainer } from "../state";

export default async function ready(this: State, container: RunningContainer)
{
    container.ready?.resolve();
};

exports.default.inject = ['$container']