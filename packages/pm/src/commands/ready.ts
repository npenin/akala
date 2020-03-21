import State, { RunningContainer } from "../state";

export default async function ready(this: State, container: RunningContainer)
{
    container.ready = true;
};

exports.default.inject = ['container']