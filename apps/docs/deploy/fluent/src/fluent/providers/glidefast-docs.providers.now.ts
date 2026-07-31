import { SPAngularProvider } from '@servicenow/sdk/core'

export const ThemeService = SPAngularProvider({
    $id: Now.ID['ThemeService'],
    name: 'ThemeService',
    type: 'service',
    script: Now.include('ThemeService.js'),
})

export const DocsService = SPAngularProvider({
    $id: Now.ID['DocsService'],
    name: 'DocsService',
    type: 'service',
    script: Now.include('DocsService.js'),
})

export const DocsUiService = SPAngularProvider({
    $id: Now.ID['DocsUiService'],
    name: 'DocsUiService',
    type: 'service',
    script: Now.include('DocsUiService.js'),
})
