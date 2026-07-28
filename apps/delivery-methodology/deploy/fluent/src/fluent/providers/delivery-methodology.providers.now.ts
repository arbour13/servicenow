import { SPAngularProvider } from '@servicenow/sdk/core'

export const ThemeService = SPAngularProvider({
    $id: Now.ID['ThemeService'],
    name: 'ThemeService',
    type: 'service',
    script: Now.include('ThemeService.js'),
})

export const DataService = SPAngularProvider({
    $id: Now.ID['DataService'],
    name: 'DataService',
    type: 'service',
    script: Now.include('DataService.js'),
})
