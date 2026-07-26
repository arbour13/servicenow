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
    $id: Now.ID['gsModal'],
    name: 'gsModal',
    type: 'directive',
    script: Now.include('gsModal.js'),
})

SPAngularProvider({
    $id: Now.ID['gsSyncAttr'],
    name: 'gsSyncAttr',
    type: 'directive',
    script: Now.include('gsSyncAttr.js'),
})

SPAngularProvider({
    $id: Now.ID['SchemaService'],
    name: 'SchemaService',
    type: 'service',
    script: Now.include('SchemaService.js'),
})

SPAngularProvider({
    $id: Now.ID['CodegenService'],
    name: 'CodegenService',
    type: 'service',
    script: Now.include('CodegenService.js'),
})

SPAngularProvider({
    $id: Now.ID['AggregateService'],
    name: 'AggregateService',
    type: 'service',
    script: Now.include('AggregateService.js'),
})

SPAngularProvider({
    $id: Now.ID['AjaxService'],
    name: 'AjaxService',
    type: 'service',
    script: Now.include('AjaxService.js'),
})

SPAngularProvider({
    $id: Now.ID['EncoderService'],
    name: 'EncoderService',
    type: 'service',
    script: Now.include('EncoderService.js'),
})

SPAngularProvider({
    $id: Now.ID['ScriptIncludeService'],
    name: 'ScriptIncludeService',
    type: 'service',
    script: Now.include('ScriptIncludeService.js'),
})

SPAngularProvider({
    $id: Now.ID['GlideQueryService'],
    name: 'GlideQueryService',
    type: 'service',
    script: Now.include('GlideQueryService.js'),
})

SPAngularProvider({
    $id: Now.ID['StandardsService'],
    name: 'StandardsService',
    type: 'service',
    script: Now.include('StandardsService.js'),
})

SPAngularProvider({
    $id: Now.ID['ExampleCallService'],
    name: 'ExampleCallService',
    type: 'service',
    script: Now.include('ExampleCallService.js'),
})

SPAngularProvider({
    $id: Now.ID['ConnectionService'],
    name: 'ConnectionService',
    type: 'service',
    script: Now.include('ConnectionService.js'),
})

SPAngularProvider({
    $id: Now.ID['ConnectionUiService'],
    name: 'ConnectionUiService',
    type: 'service',
    script: Now.include('ConnectionUiService.js'),
})

SPAngularProvider({
    $id: Now.ID['SchemaLiveService'],
    name: 'SchemaLiveService',
    type: 'service',
    script: Now.include('SchemaLiveService.js'),
})

SPAngularProvider({
    $id: Now.ID['SchemaUiService'],
    name: 'SchemaUiService',
    type: 'service',
    script: Now.include('SchemaUiService.js'),
})

SPAngularProvider({
    $id: Now.ID['PreviewUiService'],
    name: 'PreviewUiService',
    type: 'service',
    script: Now.include('PreviewUiService.js'),
})

SPAngularProvider({
    $id: Now.ID['StandardsUiService'],
    name: 'StandardsUiService',
    type: 'service',
    script: Now.include('StandardsUiService.js'),
})

SPAngularProvider({
    $id: Now.ID['gsSelect'],
    name: 'gsSelect',
    type: 'directive',
    script: Now.include('gsSelect.js'),
})

SPAngularProvider({
    $id: Now.ID['gsConditionGroups'],
    name: 'gsConditionGroups',
    type: 'directive',
    script: Now.include('gsConditionGroups.js'),
})
