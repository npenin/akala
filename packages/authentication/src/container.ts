//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$disconnect', ...args: [Argument0<typeof import('./server/commands/$disconnect.js').default>]): ReturnType<typeof import('./server/commands/$disconnect.js').default>
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./server/commands/$init.js').default>, Argument2<typeof import('./server/commands/$init.js').default>, Argument3<typeof import('./server/commands/$init.js').default>]): ReturnType<typeof import('./server/commands/$init.js').default>
		dispatch (cmd:'$request', ...args: [Argument0<typeof import('./server/commands/$request.js').default>, Argument1<typeof import('./server/commands/$request.js').default>]): ReturnType<typeof import('./server/commands/$request.js').default>
		dispatch (cmd:'add-token', ...args: [Argument0<typeof import('./server/commands/add-token.js').default>, Argument1<typeof import('./server/commands/add-token.js').default>, Argument2<typeof import('./server/commands/add-token.js').default>, Argument3<typeof import('./server/commands/add-token.js').default>]): ReturnType<typeof import('./server/commands/add-token.js').default>
		dispatch (cmd:'client.add', ...args: [Argument0<typeof import('./server/commands/client/add.js').default>, Argument1<typeof import('./server/commands/client/add.js').default>, Argument2<typeof import('./server/commands/client/add.js').default>, Argument3<typeof import('./server/commands/client/add.js').default>, Argument4<typeof import('./server/commands/client/add.js').default>]): ReturnType<typeof import('./server/commands/client/add.js').default>
		dispatch (cmd:'client.delete', ...args: [Argument0<typeof import('./server/commands/client/delete.js').default>]): ReturnType<typeof import('./server/commands/client/delete.js').default>
		dispatch (cmd:'client.renew-secret', ...args: [Argument0<typeof import('./server/commands/client/renew-secret.js').default>, Argument1<typeof import('./server/commands/client/renew-secret.js').default>]): ReturnType<typeof import('./server/commands/client/renew-secret.js').default>
		dispatch (cmd:'client.request-grant', ...args: [Argument0<typeof import('./server/commands/client/request-grant.js').default>, Argument1<typeof import('./server/commands/client/request-grant.js').default>, Argument2<typeof import('./server/commands/client/request-grant.js').default>, Argument3<typeof import('./server/commands/client/request-grant.js').default>, Argument4<typeof import('./server/commands/client/request-grant.js').default>]): ReturnType<typeof import('./server/commands/client/request-grant.js').default>
		dispatch (cmd:'client.update', ...args: [Argument0<typeof import('./server/commands/client/update.js').default>, Argument1<typeof import('./server/commands/client/update.js').default>]): ReturnType<typeof import('./server/commands/client/update.js').default>
		dispatch (cmd:'extend-token', ...args: [Argument0<typeof import('./server/commands/extend-token.js').default>, Argument1<typeof import('./server/commands/extend-token.js').default>]): ReturnType<typeof import('./server/commands/extend-token.js').default>
		dispatch (cmd:'get-oidc-configuration', ...args: [Argument0<typeof import('./server/commands/get-oidc-configuration.js').default>]): ReturnType<typeof import('./server/commands/get-oidc-configuration.js').default>
		dispatch (cmd:'getJWT', ...args: [Argument0<typeof import('./server/commands/getJWT.js').default>, Argument1<typeof import('./server/commands/getJWT.js').default>, Argument2<typeof import('./server/commands/getJWT.js').default>, Argument3<typeof import('./server/commands/getJWT.js').default>, Argument4<typeof import('./server/commands/getJWT.js').default>]): ReturnType<typeof import('./server/commands/getJWT.js').default>
		dispatch (cmd:'login', ...args: [Argument0<typeof import('./server/commands/login.js').default>, Argument1<typeof import('./server/commands/login.js').default>, Argument2<typeof import('./server/commands/login.js').default>]): ReturnType<typeof import('./server/commands/login.js').default>
		dispatch (cmd:'remove-token', ...args: [Argument0<typeof import('./server/commands/remove-token.js').default>]): ReturnType<typeof import('./server/commands/remove-token.js').default>
		dispatch (cmd:'session.add-session', ...args: [Argument0<typeof import('./server/commands/session/add-session.js').default>, Argument1<typeof import('./server/commands/session/add-session.js').default>, Argument2<typeof import('./server/commands/session/add-session.js').default>, Argument3<typeof import('./server/commands/session/add-session.js').default>, Argument4<typeof import('./server/commands/session/add-session.js').default>]): ReturnType<typeof import('./server/commands/session/add-session.js').default>
		dispatch (cmd:'session.extend-session', ...args: [Argument0<typeof import('./server/commands/session/extend-session.js').default>, Argument1<typeof import('./server/commands/session/extend-session.js').default>]): ReturnType<typeof import('./server/commands/session/extend-session.js').default>
		dispatch (cmd:'session.remove-session', ...args: [Argument0<typeof import('./server/commands/session/remove-session.js').default>]): ReturnType<typeof import('./server/commands/session/remove-session.js').default>
		dispatch (cmd:'user.add-user', ...args: [Argument0<typeof import('./server/commands/user/add-user.js').default>, Argument1<typeof import('./server/commands/user/add-user.js').default>]): ReturnType<typeof import('./server/commands/user/add-user.js').default>
		dispatch (cmd:'user.change-password', ...args: [Argument0<typeof import('./server/commands/user/change-password.js').default>, Argument1<typeof import('./server/commands/user/change-password.js').default>, Argument2<typeof import('./server/commands/user/change-password.js').default>]): ReturnType<typeof import('./server/commands/user/change-password.js').default>
		dispatch (cmd:'user.disable-user', ...args: [Argument0<typeof import('./server/commands/user/disable-user.js').default>]): ReturnType<typeof import('./server/commands/user/disable-user.js').default>
		dispatch (cmd:'user.enable-user', ...args: [Argument0<typeof import('./server/commands/user/enable-user.js').default>]): ReturnType<typeof import('./server/commands/user/enable-user.js').default>
		dispatch (cmd:'user.remove-user', ...args: [Argument0<typeof import('./server/commands/user/remove-user.js').default>]): ReturnType<typeof import('./server/commands/user/remove-user.js').default>
		dispatch (cmd:'user.request-reset-password', ...args: [Argument0<typeof import('./server/commands/user/request-reset-password.js').default>]): ReturnType<typeof import('./server/commands/user/request-reset-password.js').default>
		dispatch (cmd:'user.reset-password', ...args: [Argument0<typeof import('./server/commands/user/reset-password.js').default>, Argument1<typeof import('./server/commands/user/reset-password.js').default>, Argument2<typeof import('./server/commands/user/reset-password.js').default>]): ReturnType<typeof import('./server/commands/user/reset-password.js').default>
		dispatch (cmd:'whoami', ...args: []): ReturnType<typeof import('./server/commands/whoami.js').default>
	}
	export interface proxy 
	{
		'$disconnect'(...args: [Argument0<typeof import('./server/commands/$disconnect.js').default>]): ReturnType<typeof import('./server/commands/$disconnect.js').default>
		'$init'(...args: [Argument1<typeof import('./server/commands/$init.js').default>, Argument2<typeof import('./server/commands/$init.js').default>, Argument3<typeof import('./server/commands/$init.js').default>]): ReturnType<typeof import('./server/commands/$init.js').default>
		'$request'(...args: [Argument0<typeof import('./server/commands/$request.js').default>, Argument1<typeof import('./server/commands/$request.js').default>]): ReturnType<typeof import('./server/commands/$request.js').default>
		'add-token'(...args: [Argument0<typeof import('./server/commands/add-token.js').default>, Argument1<typeof import('./server/commands/add-token.js').default>, Argument2<typeof import('./server/commands/add-token.js').default>, Argument3<typeof import('./server/commands/add-token.js').default>]): ReturnType<typeof import('./server/commands/add-token.js').default>
		'client.add'(...args: [Argument0<typeof import('./server/commands/client/add.js').default>, Argument1<typeof import('./server/commands/client/add.js').default>, Argument2<typeof import('./server/commands/client/add.js').default>, Argument3<typeof import('./server/commands/client/add.js').default>, Argument4<typeof import('./server/commands/client/add.js').default>]): ReturnType<typeof import('./server/commands/client/add.js').default>
		'client.delete'(...args: [Argument0<typeof import('./server/commands/client/delete.js').default>]): ReturnType<typeof import('./server/commands/client/delete.js').default>
		'client.renew-secret'(...args: [Argument0<typeof import('./server/commands/client/renew-secret.js').default>, Argument1<typeof import('./server/commands/client/renew-secret.js').default>]): ReturnType<typeof import('./server/commands/client/renew-secret.js').default>
		'client.request-grant'(...args: [Argument0<typeof import('./server/commands/client/request-grant.js').default>, Argument1<typeof import('./server/commands/client/request-grant.js').default>, Argument2<typeof import('./server/commands/client/request-grant.js').default>, Argument3<typeof import('./server/commands/client/request-grant.js').default>, Argument4<typeof import('./server/commands/client/request-grant.js').default>]): ReturnType<typeof import('./server/commands/client/request-grant.js').default>
		'client.update'(...args: [Argument0<typeof import('./server/commands/client/update.js').default>, Argument1<typeof import('./server/commands/client/update.js').default>]): ReturnType<typeof import('./server/commands/client/update.js').default>
		'extend-token'(...args: [Argument0<typeof import('./server/commands/extend-token.js').default>, Argument1<typeof import('./server/commands/extend-token.js').default>]): ReturnType<typeof import('./server/commands/extend-token.js').default>
		'get-oidc-configuration'(...args: [Argument0<typeof import('./server/commands/get-oidc-configuration.js').default>]): ReturnType<typeof import('./server/commands/get-oidc-configuration.js').default>
		'getJWT'(...args: [Argument0<typeof import('./server/commands/getJWT.js').default>, Argument1<typeof import('./server/commands/getJWT.js').default>, Argument2<typeof import('./server/commands/getJWT.js').default>, Argument3<typeof import('./server/commands/getJWT.js').default>, Argument4<typeof import('./server/commands/getJWT.js').default>]): ReturnType<typeof import('./server/commands/getJWT.js').default>
		'login'(...args: [Argument0<typeof import('./server/commands/login.js').default>, Argument1<typeof import('./server/commands/login.js').default>, Argument2<typeof import('./server/commands/login.js').default>]): ReturnType<typeof import('./server/commands/login.js').default>
		'remove-token'(...args: [Argument0<typeof import('./server/commands/remove-token.js').default>]): ReturnType<typeof import('./server/commands/remove-token.js').default>
		'session.add-session'(...args: [Argument0<typeof import('./server/commands/session/add-session.js').default>, Argument1<typeof import('./server/commands/session/add-session.js').default>, Argument2<typeof import('./server/commands/session/add-session.js').default>, Argument3<typeof import('./server/commands/session/add-session.js').default>, Argument4<typeof import('./server/commands/session/add-session.js').default>]): ReturnType<typeof import('./server/commands/session/add-session.js').default>
		'session.extend-session'(...args: [Argument0<typeof import('./server/commands/session/extend-session.js').default>, Argument1<typeof import('./server/commands/session/extend-session.js').default>]): ReturnType<typeof import('./server/commands/session/extend-session.js').default>
		'session.remove-session'(...args: [Argument0<typeof import('./server/commands/session/remove-session.js').default>]): ReturnType<typeof import('./server/commands/session/remove-session.js').default>
		'user.add-user'(...args: [Argument0<typeof import('./server/commands/user/add-user.js').default>, Argument1<typeof import('./server/commands/user/add-user.js').default>]): ReturnType<typeof import('./server/commands/user/add-user.js').default>
		'user.change-password'(...args: [Argument0<typeof import('./server/commands/user/change-password.js').default>, Argument1<typeof import('./server/commands/user/change-password.js').default>, Argument2<typeof import('./server/commands/user/change-password.js').default>]): ReturnType<typeof import('./server/commands/user/change-password.js').default>
		'user.disable-user'(...args: [Argument0<typeof import('./server/commands/user/disable-user.js').default>]): ReturnType<typeof import('./server/commands/user/disable-user.js').default>
		'user.enable-user'(...args: [Argument0<typeof import('./server/commands/user/enable-user.js').default>]): ReturnType<typeof import('./server/commands/user/enable-user.js').default>
		'user.remove-user'(...args: [Argument0<typeof import('./server/commands/user/remove-user.js').default>]): ReturnType<typeof import('./server/commands/user/remove-user.js').default>
		'user.request-reset-password'(...args: [Argument0<typeof import('./server/commands/user/request-reset-password.js').default>]): ReturnType<typeof import('./server/commands/user/request-reset-password.js').default>
		'user.reset-password'(...args: [Argument0<typeof import('./server/commands/user/reset-password.js').default>, Argument1<typeof import('./server/commands/user/reset-password.js').default>, Argument2<typeof import('./server/commands/user/reset-password.js').default>]): ReturnType<typeof import('./server/commands/user/reset-password.js').default>
		'whoami'(...args: []): ReturnType<typeof import('./server/commands/whoami.js').default>
	}
   export const meta={"name":"auth","commands":[{"name":"$disconnect","config":{"fs":{"path":"dist/esm/server/commands/$disconnect.js","source":"src/server/commands/$disconnect.ts","inject":["param.0"]},"jsonrpc":{"inject":["connectionId"]},"":{"inject":[]}}},{"name":"$init","config":{"fs":{"path":"dist/esm/server/commands/$init.js","source":"src/server/commands/$init.ts","inject":["$container","param.0","param.1","param.2"]},"":{"inject":["$container","param.0","param.1","param.2"]},"cli":{"inject":["$container","options.provider","options.providerOptions","options.key"],"options":{"provider":{"needsValue":true},"providerOptions":{"needsValue":true},"key":{"needsValue":true}}}}},{"name":"$request","config":{"fs":{"path":"dist/esm/server/commands/$request.js","source":"src/server/commands/$request.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"add-token","config":{"fs":{"path":"dist/esm/server/commands/add-token.js","source":"src/server/commands/add-token.ts","inject":["param.0","param.1","param.2","param.3"]},"":{"inject":["param.0","param.1","param.2","param.3"]}}},{"name":"client.add","config":{"fs":{"path":"dist/esm/server/commands/client/add.js","source":"src/server/commands/client/add.ts","inject":["param.0","param.1","param.2","param.3","param.4"]},"":{"inject":["param.0","param.1","param.2","param.3","param.4"]}}},{"name":"client.delete","config":{"fs":{"path":"dist/esm/server/commands/client/delete.js","source":"src/server/commands/client/delete.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"client.renew-secret","config":{"fs":{"path":"dist/esm/server/commands/client/renew-secret.js","source":"src/server/commands/client/renew-secret.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"client.request-grant","config":{"fs":{"path":"dist/esm/server/commands/client/request-grant.js","source":"src/server/commands/client/request-grant.ts","inject":["param.0","param.1","param.2","param.3","param.4"]},"":{"inject":["param.0","param.1","param.2","param.3","param.4"]}}},{"name":"client.update","config":{"fs":{"path":"dist/esm/server/commands/client/update.js","source":"src/server/commands/client/update.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"extend-token","config":{"fs":{"path":"dist/esm/server/commands/extend-token.js","source":"src/server/commands/extend-token.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"get-oidc-configuration","config":{"fs":{"inject":["param.0"],"path":"dist/esm/server/commands/get-oidc-configuration.js","source":"src/server/commands/get-oidc-configuration.ts"},"http":{"inject":["headers.host"],"method":"get","route":"/.well-known/openid-configuration","type":"json"},"":{"inject":["param.0"]}}},{"name":"getJWT","config":{"fs":{"path":"dist/esm/server/commands/getJWT.js","source":"src/server/commands/getJWT.ts","inject":["param.0","param.1","param.2","param.3","param.4"]},"":{"inject":["param.0","param.1","param.2","param.3","param.4"]}}},{"name":"login","config":{"fs":{"path":"dist/esm/server/commands/login.js","source":"src/server/commands/login.ts","inject":["param.0","param.1","param.2"]},"http":{"inject":["body.username","body.password","body.deviceId"],"route":"/login","method":"post"},"jsonrpc":{"inject":["param.0","param.1","param.2","connectionId"]},"":{"inject":["param.0","param.1","param.2"]},"html":{"inject":["form.username","form.password","form.deviceId"]}}},{"name":"remove-token","config":{"fs":{"path":"dist/esm/server/commands/remove-token.js","source":"src/server/commands/remove-token.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"session.add-session","config":{"fs":{"path":"dist/esm/server/commands/session/add-session.js","source":"src/server/commands/session/add-session.ts","inject":["param.0","param.1","param.2","param.3","param.4"]},"":{"inject":["param.0","param.1","param.2","param.3","param.4"]}}},{"name":"session.extend-session","config":{"fs":{"path":"dist/esm/server/commands/session/extend-session.js","source":"src/server/commands/session/extend-session.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"session.remove-session","config":{"fs":{"path":"dist/esm/server/commands/session/remove-session.js","source":"src/server/commands/session/remove-session.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"user.add-user","config":{"fs":{"inject":["param.0","param.1"],"path":"dist/esm/server/commands/user/add-user.js","source":"src/server/commands/user/add-user.ts"},"http":{"inject":[],"route":"/signup","method":"post"},"":{"inject":["param.0","param.1"]},"html":{"inject":["form.username","form.password"]}}},{"name":"user.change-password","config":{"fs":{"path":"dist/esm/server/commands/user/change-password.js","source":"src/server/commands/user/change-password.ts","inject":["param.0","param.1","param.2"]},"":{"inject":["param.0","param.1","param.2"]}}},{"name":"user.disable-user","config":{"fs":{"path":"dist/esm/server/commands/user/disable-user.js","source":"src/server/commands/user/disable-user.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"user.enable-user","config":{"fs":{"path":"dist/esm/server/commands/user/enable-user.js","source":"src/server/commands/user/enable-user.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"user.remove-user","config":{"fs":{"path":"dist/esm/server/commands/user/remove-user.js","source":"src/server/commands/user/remove-user.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"user.request-reset-password","config":{"fs":{"path":"dist/esm/server/commands/user/request-reset-password.js","source":"src/server/commands/user/request-reset-password.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"user.reset-password","config":{"fs":{"path":"dist/esm/server/commands/user/reset-password.js","source":"src/server/commands/user/reset-password.ts","inject":["param.0","param.1","param.2"]},"":{"inject":["param.0","param.1","param.2"]}}},{"name":"whoami","config":{"fs":{"path":"dist/esm/server/commands/whoami.js","source":"src/server/commands/whoami.ts","inject":["ignore","ignore"]},"auth":{"":{"inject":["auth.sessionId","auth.sessionSignature"]},"required":true},"":{"inject":["_trigger","auth.sessionId"]},"jsonrpc":{"inject":["_trigger","connectionId"]}}}]} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
        const container = new Container<void>("commands", void 0);
        registerCommands(meta.commands, processor, container);
        return container as container & Container<void>;
    }
}

export { commands as default };