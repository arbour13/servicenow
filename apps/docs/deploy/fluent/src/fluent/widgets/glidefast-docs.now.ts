import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, DocsService, DocsUiService } from '../providers/glidefast-docs.providers.now'

SPWidget({
    $id: Now.ID['widget'],
    name: 'GlideFast Docs',
    id: 'glidefast_docs',
    description: 'GlideFast Docs - hosts reference documentation including the GlideFast scripting best-practices standards.',
    controllerAs: 'vm',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('glidefast-docs.client.js'),
    serverScript: Now.include('glidefast-docs.server.js'),
    htmlTemplate: Now.include('glidefast-docs.html'),
    customCss: Now.include('glidefast-docs.scss'),
    angularProviders: [ThemeService, DocsService, DocsUiService],
})
