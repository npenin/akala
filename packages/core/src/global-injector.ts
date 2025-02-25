import { defaultInjector } from './injectors/simple-injector.js';

// declare let $$defaultInjector;

if (!globalThis['$$defaultInjector'])
    globalThis['$$defaultInjector'] = defaultInjector;