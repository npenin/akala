import { sort } from "../commands/bump-dependents.js";

console.log(sort([
    { name: '@domojs/devices', workspaceDependencies: ['@akala/core'], location: '', bump: 'decline' },
    { name: '@domojs/rfx-parsers', workspaceDependencies: ['@domojs/devices'], location: '', bump: 'decline' },
    { name: '@domojs/rfx', workspaceDependencies: ['@domojs/rfx-parsers', '@domojs/devices'], location: '', bump: 'decline' },
    { name: '@domojs/zigate-parsers', workspaceDependencies: ['@domojs/devices'], location: '', bump: 'decline' },
    { name: '@domojs/zigate', workspaceDependencies: ['@domojs/zigate-parsers', '@domojs/devices'], location: '', bump: 'decline' },
]).map(w => w.name).join(', '))


console.log(sort([
    { name: '@domojs/rfx', workspaceDependencies: ['@domojs/rfx-parsers', '@domojs/devices'], location: '', bump: 'decline' },
    { name: '@domojs/zigate', workspaceDependencies: ['@domojs/zigate-parsers', '@domojs/devices'], location: '', bump: 'decline' },
    { name: '@domojs/rfx-parsers', workspaceDependencies: ['@domojs/devices'], location: '', bump: 'decline' },
    { name: '@domojs/devices', workspaceDependencies: [], location: '', bump: 'decline' },
    { name: '@domojs/zigate-parsers', workspaceDependencies: ['@domojs/devices'], location: '', bump: 'decline' },
]).map(w => w.name).join(', '))