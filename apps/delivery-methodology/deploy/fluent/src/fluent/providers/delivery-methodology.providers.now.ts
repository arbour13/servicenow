import { SPAngularProvider } from '@servicenow/sdk/core'

SPAngularProvider({
    $id: Now.ID['ThemeService'],
    name: 'ThemeService',
    type: 'service',
    script: Now.include('ThemeService.js'),
})

SPAngularProvider({
    $id: Now.ID['DataService'],
    name: 'DataService',
    type: 'service',
    script: Now.include('DataService.js'),
})
