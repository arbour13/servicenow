import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal } from '../providers/delivery-methodology.providers.now'

SPWidget({
    $id: Now.ID['widget_methodology'],
    name: 'DM Methodology',
    id: 'dm_methodology',
    description: 'DM Methodology',
    controllerAs: 'c',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('delivery-methodology-methodology.client.js'),
    serverScript: Now.include('delivery-methodology-methodology.server.js'),
    htmlTemplate: Now.include('delivery-methodology-methodology.html'),
    customCss: Now.include('delivery-methodology-methodology.scss'),
    angularProviders: [ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal],
})
