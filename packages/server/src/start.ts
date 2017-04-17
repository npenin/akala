import * as cluster from 'cluster';

process.on('warning', e => console.warn(e.stack));

if (cluster.isMaster)
{
    require('./master');
}
else
{
    require('./worker');
}