import * as cluster from 'cluster';
import * as express from 'express';

process.on('warning', e => console.warn(e.stack));

var app = express();

if (cluster.isMaster)
{
    require('./master');
}
else
{
    require('./worker');
}