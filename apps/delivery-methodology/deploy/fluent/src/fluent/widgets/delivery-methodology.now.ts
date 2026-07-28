import { SPWidget } from '@servicenow/sdk/core'
import { ThemeService, DataService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal } from '../providers/delivery-methodology.providers.now'

SPWidget({
    $id: Now.ID['widget'],
    name: 'Delivery Methodology',
    id: 'delivery_methodology',
    description: 'GlideFast delivery methodology: phases, sub-phases, RACI by task and job title, job aids, and an auto-generated change log.',
    controllerAs: 'c',
    hasPreview: true,
    category: 'custom',
    clientScript: Now.include('delivery-methodology.client.js'),
    serverScript: Now.include('delivery-methodology.server.js'),
    htmlTemplate: Now.include('delivery-methodology.html'),
    customCss: Now.include('delivery-methodology.scss'),
    angularProviders: [ThemeService, DataService, ChangelogDiffService, RaciGridService, NavigationService, SearchService, WhatsNewService, ReferenceService, IdSeqService, IconService, TipService, JargonService, MessagingService, ContentEditService, StructureEditService, dmModal],
})
