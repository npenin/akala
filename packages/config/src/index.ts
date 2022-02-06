import commander from './commander';
import Configuration, { ProxyConfiguration } from './configuration'

export default Configuration;
export { Configuration as Configuration, ProxyConfiguration };

export type container = commander.container;
export type containerHelper = commander.proxy;
