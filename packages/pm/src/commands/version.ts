import State from "../state";
import { join } from "path";


export default async function version(this: State, packageName: string, folder: string): Promise<string>
{
    var path = folder || this.config.containers['pm'][0];

    if (packageName == 'pm' || typeof packageName == 'undefined')
        var packageConfig = require('../../package.json');
    else
    {
        var packageConfig = require(join(path, 'node_modules', packageName, './package.json'));
        delete require.cache[join(path, 'node_modules', packageName, './package.json')];
    }
    return packageConfig.version;
}

exports.default.$inject = ['param.0', 'param.1']
