import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['widget'],
    name: 'Core',
    id: 'x_core_core_widget',
    description: 'Core - shared foundation app: reusable AngularJS providers and a generic documentation/wiki widget for the ServiceNow app suite.',
    controllerAs: 'vm',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('core.client.js'),
    serverScript: Now.include('core.server.js'),
    htmlTemplate: Now.include('core.html'),
    customCss: Now.include('core.scss'),
})
