import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['widget'],
    name: 'GlideFast Standards Portal',
    id: 'x_gfsp_standards_widget',
    description: 'GlideFast Standards Portal - hosts the GlideFast scripting best-practices reference document.',
    controllerAs: 'vm',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('glidefast-standards-portal.client.js'),
    serverScript: Now.include('glidefast-standards-portal.server.js'),
    htmlTemplate: Now.include('glidefast-standards-portal.html'),
    customCss: Now.include('glidefast-standards-portal.scss'),
})
