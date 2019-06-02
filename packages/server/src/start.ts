import * as cluster from 'cluster';
import 'source-map-support/register'

Error.stackTraceLimit = Infinity;
process.on('warning', e => console.warn(e.stack));

process.argv = process.argv.filter(function (v) { return v.length < 2 || v.substring(0, 2) != '--' });

if (process.argv && process.argv.length > 2)
{
    require('./worker');
}

else if (cluster.isMaster)
{
    require('./master');
}
else
{
    require('./worker');
}