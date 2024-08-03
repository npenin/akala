import commander from './commander.js';
import Configuration, { ProxyConfiguration } from './configuration.js'

export default Configuration;
export { Configuration as Configuration, ProxyConfiguration };

export type container = commander.container;
export type containerHelper = commander.proxy;
