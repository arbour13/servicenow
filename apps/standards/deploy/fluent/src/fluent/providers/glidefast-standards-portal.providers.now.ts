import { SPAngularProvider } from '@servicenow/sdk/core'

SPAngularProvider({
    $id: Now.ID['StandardsService'],
    name: 'StandardsService',
    type: 'service',
    script: Now.include('StandardsService.js'),
})

SPAngularProvider({
    $id: Now.ID['StandardsUiService'],
    name: 'StandardsUiService',
    type: 'service',
    script: Now.include('StandardsUiService.js'),
})
