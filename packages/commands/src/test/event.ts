import { calculator } from './calculator'
import * as assert from 'assert'
import { Local, Pipe, EventProcessor } from '../processors';
import { Container } from '../model/container';
import { metadata, registerCommands } from '../generator';

describe('test event processing', function ()
{
    it('should handle basics', async function ()
    {
        var processor = new EventProcessor(new Pipe(calculator));
        var calculator2 = new Container(calculator.name, calculator.state);
        calculator2.trap(processor as any);
        var processingCalled: string | undefined;
        var processedCalled: string | undefined;
        processor.once('processing', function (cmd)
        {
            processingCalled = cmd;
        })
        processor.once('processed', function (cmd)
        {
            processedCalled = cmd;
        })
        debugger;
        await calculator2.dispatch('reset');
        assert.strictEqual(processingCalled, 'reset', 'processing was not called')
        assert.strictEqual(processedCalled, 'reset', 'processed was not called')
    })
})