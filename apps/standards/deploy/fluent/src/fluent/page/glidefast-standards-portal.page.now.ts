import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['page'],
    table: 'sp_page',
    data: {
        category: 'custom',
        id: 'x_gfsp_standards_page',
        internal: false,
        roles: '',
        short_description: 'GlideFast Standards Portal page',
        title: 'GlideFast Standards Portal',
    },
})

Record({
    $id: Now.ID['container'],
    table: 'sp_container',
    data: {
        bootstrap_alt: 'false',
        name: 'GlideFast Standards Portal',
        order: '100',
        sp_page: 'c7d8e9f0a10000112233440005',
        width: 'container-fluid',
    },
})

Record({
    $id: Now.ID['row'],
    table: 'sp_row',
    data: {
        order: '100',
        sp_container: 'c7d8e9f0a10000112233440006',
    },
})

Record({
    $id: Now.ID['column'],
    table: 'sp_column',
    data: {
        order: '100',
        size: '12',
        sp_row: 'c7d8e9f0a10000112233440007',
    },
})

Record({
    $id: Now.ID['instance'],
    table: 'sp_instance',
    data: {
        order: 100,
        sp_column: 'c7d8e9f0a10000112233440008',
        sp_widget: 'c7d8e9f0a10000112233440002',
        title: 'GlideFast Standards Portal',
    },
})
