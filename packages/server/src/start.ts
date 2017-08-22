import * as cluster from 'cluster';
require('source-map-support').install();

Error.stackTraceLimit = Infinity;
process.on('warning', e => console.warn(e.stack));

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