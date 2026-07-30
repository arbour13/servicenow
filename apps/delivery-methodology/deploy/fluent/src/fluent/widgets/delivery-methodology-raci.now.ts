import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, MotionService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, UrlPolicyService, ContentEditService, StructureEditService, dmModal } from '../providers/delivery-methodology.providers.now'

SPWidget({
    $id: Now.ID['widget_raci'],
    name: 'DM RACI',
    id: 'dm_raci',
    description: 'DM RACI',
    controllerAs: 'c',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('delivery-methodology-raci.client.js'),
    serverScript: Now.include('delivery-methodology-raci.server.js'),
    htmlTemplate: Now.include('delivery-methodology-raci.html'),
    customCss: Now.include('delivery-methodology-raci.scss'),
    angularProviders: [ThemeService, MotionService, DataService, MethodologyDomainService, AppStateService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, UrlPolicyService, ContentEditService, StructureEditService, dmModal],
})
