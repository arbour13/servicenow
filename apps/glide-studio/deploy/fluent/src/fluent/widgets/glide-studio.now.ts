import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['widget'],
    name: 'Glide Studio',
    id: 'x_glide_studio_ng_widget',
    description: 'Glide Studio (AngularJS rebuild) - visual builder for ServiceNow GlideRecord, GlideAjax, GlideAggregate, Script Include, and Encoded Query scripts.',
    controllerAs: 'vm',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('glide-studio.client.js'),
    serverScript: Now.include('glide-studio.server.js'),
    htmlTemplate: Now.include('glide-studio.html'),
    customCss: Now.include('glide-studio.scss'),
})
