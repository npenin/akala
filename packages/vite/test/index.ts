/// <reference types="vite/client" />
import './index.css'
import { bootstrapModule, OutletService, outletDefinition } from '@akala/client'
import { Signup } from './signup/signup.js';
import { Login } from './login/login.js';
import Home from './home.js';
import { bootstrap } from '@akala/web-ui';
import { DesignKit } from './design-kit/index.js';


bootstrapModule.activate(['services.$outlet'], async (outlet: OutletService) =>
{
    outlet.use('/signup', 'main', Signup[outletDefinition]);
    outlet.use('/design-kit', 'main', DesignKit[outletDefinition]);
    outlet.use('/login', 'main', Login[outletDefinition]);
    outlet.use('/', 'main', Home);
})

bootstrap('app')
