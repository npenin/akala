import { calculator } from './calculator'
import * as assert from 'assert'
import { Local, LogProcessor, Pipe } from '../processors';
import { Container } from '../model/container';
import { CommandNameProcessor } from '../model/processor';

describe('test log processing', function ()
{
    it('should handle basics', async function ()
    {
        const processor = new LogProcessor(new Pipe(calculator), function (cmd: string)
        {
            processingCalled = cmd;
            return Promise.resolve();
        }, function (cmd: string)
        {
            processedCalled = cmd;
            return Promise.resolve();
        });
        const calculator2 = new Container(calculator.name, calculator.state);
        calculator2.trap(processor as unknown as CommandNameProcessor);
        let processingCalled: string | undefined;
        let processedCalled: string | undefined;
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})