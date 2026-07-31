import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['page'],
    table: 'sp_page',
    data: {
        category: 'custom',
        id: 'glidefast_docs',
        internal: false,
        roles: ['e9f0a1b2c3f5108920f5108921f51089', 'e9f0a1b2c3d464193ed464193fd46419', 'e9f0a1b2c3f404b51cf404b51df404b5'],
        short_description: 'GlideFast Docs page',
        title: 'GlideFast Docs',
    },
})

Record({
    $id: Now.ID['container'],
    table: 'sp_container',
    data: {
        bootstrap_alt: false,
        name: 'GlideFast Docs - Container 1',
        order: 1,
        sp_page: 'e9f0a1b2c3c4a60205c4a60206c4a602',
        width: 'container-fluid',
    },
})

Record({
    $id: Now.ID['row'],
    table: 'sp_row',
    data: {
        order: 1,
        sp_container: 'e9f0a1b2c30c6037770c6037780c6037',
    },
})

Record({
    $id: Now.ID['column'],
    table: 'sp_column',
    data: {
        order: 1,
        size: 12,
        sp_row: 'e9f0a1b2c3067ab290067ab291067ab2',
    },
})

Record({
    $id: Now.ID['instance'],
    table: 'sp_instance',
    data: {
        active: true,
        order: 1,
        sp_column: 'e9f0a1b2c3dad75d0cdad75d0ddad75d',
        sp_widget: 'e9f0a1b2c3ac99e07aac99e07bac99e0',
        title: 'GlideFast Docs',
    },
})
