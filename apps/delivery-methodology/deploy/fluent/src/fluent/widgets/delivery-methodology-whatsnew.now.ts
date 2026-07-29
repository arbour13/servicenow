import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal } from '../providers/delivery-methodology.providers.now'

SPWidget({
    $id: Now.ID['widget_whatsnew'],
    name: 'DM What\'s New',
    id: 'dm_whatsnew',
    description: 'DM What\'s New',
    controllerAs: 'c',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('delivery-methodology-whatsnew.client.js'),
    serverScript: Now.include('delivery-methodology-whatsnew.server.js'),
    htmlTemplate: Now.include('delivery-methodology-whatsnew.html'),
    customCss: Now.include('delivery-methodology-whatsnew.scss'),
    angularProviders: [ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal],
})
