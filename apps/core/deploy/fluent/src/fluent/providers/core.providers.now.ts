import { SPAngularProvider } from '@servicenow/sdk/core'

SPAngularProvider({
    $id: Now.ID['ThemeService'],
    name: 'ThemeService',
    type: 'service',
    script: Now.include('ThemeService.js'),
})

SPAngularProvider({
    $id: Now.ID['ConfirmModalService'],
    name: 'ConfirmModalService',
    type: 'service',
    script: Now.include('ConfirmModalService.js'),
})

SPAngularProvider({
    $id: Now.ID['DocViewerService'],
    name: 'DocViewerService',
    type: 'service',
    script: Now.include('DocViewerService.js'),
})

SPAngularProvider({
    $id: Now.ID['coreModal'],
    name: 'coreModal',
    type: 'directive',
    script: Now.include('coreModal.js'),
})

SPAngularProvider({
    $id: Now.ID['coreSyncAttr'],
    name: 'coreSyncAttr',
    type: 'directive',
    script: Now.include('coreSyncAttr.js'),
})

SPAngularProvider({
    $id: Now.ID['coreDoc'],
    name: 'coreDoc',
    type: 'directive',
    script: Now.include('coreDoc.js'),
})

SPAngularProvider({
    $id: Now.ID['CoreDocsService'],
    name: 'CoreDocsService',
    type: 'service',
    script: Now.include('CoreDocsService.js'),
})
