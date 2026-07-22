import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['page'],
    table: 'sp_page',
    data: {
        category: 'custom',
        id: 'x_core_core_page',
        internal: false,
        roles: '',
        short_description: 'Core page',
        title: 'Core',
    },
})

Record({
    $id: Now.ID['container'],
    table: 'sp_container',
    data: {
        bootstrap_alt: 'false',
        name: 'Core',
        order: '100',
        sp_page: 'e5f6a7b8c90034628f00112233',
        width: 'container-fluid',
    },
})

Record({
    $id: Now.ID['row'],
    table: 'sp_row',
    data: {
        order: '100',
        sp_container: 'e5f6a7b8c9e7814c8100112233',
    },
})

Record({
    $id: Now.ID['column'],
    table: 'sp_column',
    data: {
        order: '100',
        size: '12',
        sp_row: 'e5f6a7b8c90001b9da00112233',
    },
})

Record({
    $id: Now.ID['instance'],
    table: 'sp_instance',
    data: {
        order: 100,
        sp_column: 'e5f6a7b8c9af3ed35600112233',
        sp_widget: 'e5f6a7b8c9d1075a4400112233',
        title: 'Core',
    },
})
