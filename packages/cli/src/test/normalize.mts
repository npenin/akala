import * as assert from 'assert'
import 'source-map-support/register'
import normalize from '../helpers/normalize.js';
import path from 'path'
// import { createRequire } from 'module';

//     const require = createRequire(import.meta.url);

assert.strictEqual(normalize('require', process.cwd(), '@akala/cli'), require.resolve('@akala/cli'));
assert.strictEqual(normalize('requireMeta', process.cwd(), '@akala/cli'), require.resolve('@akala/cli/package.json'));
assert.strictEqual(normalize('require', process.cwd(), '@akala/cli/LICENSE'), path.resolve(__dirname, '../../LICENSE'));
