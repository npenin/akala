import { calculator } from './calculator'
import * as assert from 'assert'
import { Local, LogProcessor, Pipe } from '../processors';
import { Container } from '../model/container';

describe('test log processing', function ()
{
    it('should handle basics', async function ()
    {
        var processor = new LogProcessor(new Pipe(calculator), function (cmd: string)
        {
            processingCalled = cmd;
        }, function (cmd: string)
        {
            processedCalled = cmd;
        });
        var calculator2 = new Container(calculator.name, calculator.state);
        calculator2.trap(processor as any);
        var processingCalled: string | undefined;
        var processedCalled: string | undefined;
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})