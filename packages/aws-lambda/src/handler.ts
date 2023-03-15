import { Container, Processors } from '@akala/commands'
import { trigger } from './trigger.js'

export { trigger };

const container = new Container('AWS-lambda', {});
await Processors.FileSystem.discoverCommands(process.cwd(), container, { isDirectory: true });
var initCmd = container.resolve('$init');
if (initCmd)
    await container.dispatch(initCmd);

export const handler = container.attach(trigger, process.env.AKALA_AWS);