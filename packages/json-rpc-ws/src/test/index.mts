import WS from 'ws';
import * as JsonRpcWs from '@akala/json-rpc-ws';
// const Browserify = require('browserify');
// const Webdriver = require('selenium-webdriver');
import puppeteer from 'puppeteer';
import { describe, it, before, after } from 'node:test';
import assert from 'assert'

describe('json-rpc ws', () =>
{

  const server = JsonRpcWs.ws.createServer({ host: 'localhost', port: 8081 });
  const client = JsonRpcWs.ws.createClient();
  //const delayBuffer = [];

  before(() =>
  {

    server.expose('reflect', function reflectReply(params, reply)
    {

      reply(null, params || 'empty');
    });
    server.expose('error', function errorReply(params, reply)
    {

      reply('error' as any, null);
    });
    server.expose('browserClient', function browserReply(params, reply)
    {
      reply(null, this.id);
    });

    return new Promise((resolve) =>
    {
      server.start(null, function ()
      {
        client.connect('ws://localhost:8081', resolve);
      });
    });
  });

  after(async () =>
  {
    await client.disconnect();
    await server.stop();
  });

  it('client has an id', () =>
  {

    assert.ok(client.id);
  });

  it('reflecting handler', () =>
    Promise.all([
      new Promise<void>((resolve) =>
      {

        client.send('reflect', ['test one'], function (error1, reply1)
        {
          assert.equal(error1, undefined);
          assert.strictEqual((reply1 as [])?.length, 1);
          assert.strict(reply1[0], 'test one');
          resolve();
        });
      }),
      new Promise<void>((resolve) =>
      {

        client.send('reflect', ['test two'], function (error2, reply2)
        {
          assert.equal(error2, undefined);
          assert.strictEqual((reply2 as [])?.length, 1);
          assert.strict(reply2[0], 'test two');
          resolve();
        });
      }),
      new Promise<void>((resolve) =>
      {

        client.send('reflect', null, function (error3, reply3)
        {
          assert.equal(error3, undefined);
          assert.strict(reply3, 'empty');
          resolve();
        });
      }),
      new Promise<void>((resolve) =>
      {
        client.send('reflect', undefined, function (error4, reply4)
        {
          assert.equal(error4, undefined);
          assert.strict(reply4, 'empty');
          resolve();
        });
      })
    ]) as unknown as Promise<void>);

  it('error reply', () =>
  {

    return new Promise<void>((resolve) =>
    {

      client.send('error', null, function (error, reply)
      {
        assert.equal(reply, undefined);
        assert.strict(error, 'error');
        resolve();
      });
    });
  });

  it('cannot register duplicate handler', () =>
  {

    const throws = () =>
    {

      server.expose('reflect', function (params, reply)
      {

        reply(undefined, undefined);
      });
    };
    assert.throws(throws);
  });

  it('hasHandler', () =>
  {
    assert.ok(server.hasHandler('reflect'));
    assert.ok(!server.hasHandler('nonexistant'));
  });


  it('connectionId', () =>
  {

    let connectionId;
    server.expose('saveConnection', function saveConnectionReply(params, reply)
    {
      assert.ok(this.id);
      connectionId = this.id;
      reply(null, 'ok');
    });

    client.expose('info', function infoReply(params, reply)
    {
      assert.equal(params, undefined);
      reply(null, 'info ok');
    });
    return new Promise<void>((resolve) =>
    {

      client.send('saveConnection', null, function ()
      {

        assert.ok(connectionId);
        assert.ok(server.getConnection(connectionId));
        server.send(connectionId, 'info', null, function (err, result)
        {
          assert.equal(err, undefined);
          assert.equal(result, 'info ok');
          resolve();
        });
      });
    });
  });

  it('invalid connection id', () =>
  {
    server.send(0, 'info', undefined); //No callback is ok
    return new Promise<void>((resolve) =>
    {

      server.send(0, 'info', undefined, function (err, result)
      {

        assert.equal(result, undefined);
        assert.ok('code' in err);
        assert.ok('message' in err);
        assert.equal(err.code, -32000);
        resolve();
      });
    });
  });

  it('invalid payloads do not throw exceptions', async () =>
  {

    //This is for code coverage in the message handler to make sure rogue messages won't take the server down.;
    const socket = new WS('ws://localhost:8081');
    await new Promise<void>((resolve) =>
    {

      socket.on('open', function ()
      {

        //TODO socket callbacks + socket.once('message') with response validation for each of these instead of this setTimeout nonsense
        socket.send('asdf\n');
        socket.send('{}\n');
        socket.send('{"jsonrpc":"2.0"}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect"}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":null}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":"asdf"}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":0}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":[0]}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "params":null}\n');
        socket.send('{"jsonrpc":"2.0", "method":"reflect", "id":null, "params":null}\n');
        socket.send('{"jsonrpc":"2.0", "error":{"code": -32000, "message":"Server error"}}\n');
        socket.send('{"jsonrpc":"2.0", "id":"asdf", "result":"test"}\n');
        socket.send('[{"jsonrpc":"2.0", "result":"test"},{"jsonrpc":"2.0", "result":"rest"}]');
        setTimeout(resolve, 100);
      });
    });
    socket.close();
  });

  it('client.send', () =>
  {

    //No callback
    const doesNotThrow = () =>
    {

      client.send('reflect', null); //Valid method
      client.send('nonexistant', null); //Unexposed method
    };

    const throws = () =>
    {

      client.send(1 as unknown as string, null); //Invalid method
    };
    assert.throws(throws);
    assert.doesNotThrow(doesNotThrow);
  });

  it('client hangups', () =>
  {
    const clientA = JsonRpcWs.ws.createClient();
    const clientB = JsonRpcWs.ws.createClient();
    return new Promise<void>((resolve, reject) =>
    {
      clientA.connect('ws://localhost:8081', function (err)
      {
        if (err)
          reject(err);
        else
          clientA.disconnect().then(function ()
          {
            clientB.connect('ws://localhost:8081', function (err)
            {
              if (err)
                reject(err);
              else
                clientB.disconnect().then(() => resolve(), reject);
            });
          }, reject);
      });
    });
  });

  it('server.start without callback', () =>
  {

    const serverA = JsonRpcWs.ws.createServer();
    const serverAserver = new JsonRpcWs.ws.ServerAdapter({ port: 8082 });
    serverA.start(serverAserver);
    return new Promise<void>((resolve) =>
    {
      serverAserver.once('listening', resolve);
    }).then(() =>
    {
      serverA.stop()
    });
  });

  it('errors', () =>
  {

    let payload;
    payload = JsonRpcWs.Errors('parseError');
    assert.equal(payload.id, undefined);
    assert.ok('code' in payload.error);
    assert.ok('message' in payload.error);
    assert.equal(payload.error.data, undefined);
    payload = JsonRpcWs.Errors('parseError', 'a');
    assert.equal(payload.id, 'a');
    assert.ok('code' in payload.error);
    assert.ok('message' in payload.error);
    assert.equal(payload.error.data, undefined);
    payload = JsonRpcWs.Errors('parseError', 'b', { extra: 'data' });
    assert.equal(payload.id, 'b');
    assert.ok('code' in payload.error);
    assert.ok('message' in payload.error);
    assert.deepEqual(payload.error.data, { extra: 'data' });
  });

  describe('browser', () =>
  {
    before(() =>
    {
      // process.env.PATH = `${process.env.PATH}:./node_modules/.bin`;
    });

    it.skip('works in browser', async () =>
    {

      const driver = await puppeteer.launch();
      const page = await driver.newPage();
      console.log(new URL('../../../browser_test._js', import.meta.url).toString());
      await page.addScriptTag({ path: new URL('../../../browser_test._js', import.meta.url).toString() });
      var response = await page.evaluate(function ()
      {

        var callback = arguments[arguments.length - 1];
        window['browserClient'].connect('ws://localhost:8081', function connected()
        {

          window['browserClient'].send('browserClient', ['browser', 'client'], function sendReply(err, reply)
          {

            callback([err, reply]);
          });
        });
      });

      const err = response[0];
      const browserId = response[1];
      assert.equal(browserId, undefined);
      assert.equal(err, null);
      await new Promise<void>(resolve =>
      {
        server.send(browserId, 'info', null, function (err, result)
        {

          assert.equal(err, undefined);
          assert.equal(result, 'browser');
          driver.close();
          resolve();
        });
      });
    });

  });
});
