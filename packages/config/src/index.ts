import commander from './commander.js';
import Configuration, { ProxyConfiguration, unwrap } from './configuration.js'

export default Configuration;
export { Configuration as Configuration, ProxyConfiguration, unwrap };

export type container = commander.container;
export type containerHelper = commander.proxy;
