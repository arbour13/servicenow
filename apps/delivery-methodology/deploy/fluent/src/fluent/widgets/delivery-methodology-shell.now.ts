import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal } from '../providers/delivery-methodology.providers.now'

SPWidget({
    $id: Now.ID['widget_shell'],
    name: 'DM Shell',
    id: 'dm_shell',
    description: 'DM Shell',
    controllerAs: 'c',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('delivery-methodology-shell.client.js'),
    serverScript: Now.include('delivery-methodology-shell.server.js'),
    htmlTemplate: Now.include('delivery-methodology-shell.html'),
    customCss: Now.include('delivery-methodology-shell.scss'),
    angularProviders: [ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal],
})
