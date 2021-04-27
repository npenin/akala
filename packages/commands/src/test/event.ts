import { calculator } from './calculator/index.js'
import * as assert from 'assert'
import { Pipe, EventProcessor } from '../processors/index.js';
import { Container } from '../model/container.js';
import { CommandNameProcessor } from '../model/processor.js';

describe('test event processing', function ()
{
    it('should handle basics', async function ()
    {
        const processor = new EventProcessor(new Pipe(calculator));
        const calculator2 = new Container(calculator.name, calculator.state);
        calculator2.trap(processor as CommandNameProcessor);
        let processingCalled: string | undefined;
        let processedCalled: string | undefined;
        processor.once('processing', function (cmd)
        {
            processingCalled = cmd;
        })
        processor.once('processed', function (cmd)
        {
            processedCalled = cmd;
        })
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})