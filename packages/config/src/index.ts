import type commander from './commander.js';
import Configuration, { type ProxyConfiguration, unwrap } from './configuration.js'

export default Configuration;
export { Configuration as Configuration, type ProxyConfiguration, unwrap };

export type container = commander.container;
export type containerHelper = commander.proxy;
