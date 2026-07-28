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

export const ChangelogDiffService = SPAngularProvider({
    $id: Now.ID['ChangelogDiffService'],
    name: 'ChangelogDiffService',
    type: 'service',
    script: Now.include('ChangelogDiffService.js'),
})

export const RaciGridService = SPAngularProvider({
    $id: Now.ID['RaciGridService'],
    name: 'RaciGridService',
    type: 'service',
    script: Now.include('RaciGridService.js'),
})

export const NavigationService = SPAngularProvider({
    $id: Now.ID['NavigationService'],
    name: 'NavigationService',
    type: 'service',
    script: Now.include('NavigationService.js'),
})

export const SearchService = SPAngularProvider({
    $id: Now.ID['SearchService'],
    name: 'SearchService',
    type: 'service',
    script: Now.include('SearchService.js'),
})

export const WhatsNewService = SPAngularProvider({
    $id: Now.ID['WhatsNewService'],
    name: 'WhatsNewService',
    type: 'service',
    script: Now.include('WhatsNewService.js'),
})

export const ReferenceService = SPAngularProvider({
    $id: Now.ID['ReferenceService'],
    name: 'ReferenceService',
    type: 'service',
    script: Now.include('ReferenceService.js'),
})

export const IdSeqService = SPAngularProvider({
    $id: Now.ID['IdSeqService'],
    name: 'IdSeqService',
    type: 'service',
    script: Now.include('IdSeqService.js'),
})

export const IconService = SPAngularProvider({
    $id: Now.ID['IconService'],
    name: 'IconService',
    type: 'service',
    script: Now.include('IconService.js'),
})

export const TipService = SPAngularProvider({
    $id: Now.ID['TipService'],
    name: 'TipService',
    type: 'service',
    script: Now.include('TipService.js'),
})

export const JargonService = SPAngularProvider({
    $id: Now.ID['JargonService'],
    name: 'JargonService',
    type: 'service',
    script: Now.include('JargonService.js'),
})

export const MessagingService = SPAngularProvider({
    $id: Now.ID['MessagingService'],
    name: 'MessagingService',
    type: 'service',
    script: Now.include('MessagingService.js'),
})

export const ContentEditService = SPAngularProvider({
    $id: Now.ID['ContentEditService'],
    name: 'ContentEditService',
    type: 'service',
    script: Now.include('ContentEditService.js'),
})

export const StructureEditService = SPAngularProvider({
    $id: Now.ID['StructureEditService'],
    name: 'StructureEditService',
    type: 'service',
    script: Now.include('StructureEditService.js'),
})

export const dmModal = SPAngularProvider({
    $id: Now.ID['dmModal'],
    name: 'dmModal',
    type: 'directive',
    script: Now.include('dmModal.js'),
})
