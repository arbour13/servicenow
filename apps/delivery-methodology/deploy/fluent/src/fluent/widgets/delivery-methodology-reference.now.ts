import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, UrlPolicyService, ContentEditService, StructureEditService, dmModal } from '../providers/delivery-methodology.providers.now'

SPWidget({
    $id: Now.ID['widget_reference'],
    name: 'DM Reference',
    id: 'dm_reference',
    description: 'DM Reference',
    controllerAs: 'c',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('delivery-methodology-reference.client.js'),
    serverScript: Now.include('delivery-methodology-reference.server.js'),
    htmlTemplate: Now.include('delivery-methodology-reference.html'),
    customCss: Now.include('delivery-methodology-reference.scss'),
    angularProviders: [ThemeService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, UrlPolicyService, ContentEditService, StructureEditService, dmModal],
})
