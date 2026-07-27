import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['page'],
    table: 'sp_page',
    data: {
        category: 'custom',
        id: 'x_dlvry_method_page',
        internal: false,
        roles: '',
        short_description: 'Delivery Methodology page',
        title: 'Delivery Methodology',
    },
})

Record({
    $id: Now.ID['container'],
    table: 'sp_container',
    data: {
        bootstrap_alt: 'false',
        name: 'Delivery Methodology',
        order: '100',
        sp_page: 'a4b5c6d7e8c4a60205c4a60206c4a602',
        width: 'container-fluid',
    },
})

Record({
    $id: Now.ID['row'],
    table: 'sp_row',
    data: {
        order: '100',
        sp_container: 'a4b5c6d7e80c6037770c6037780c6037',
    },
})

Record({
    $id: Now.ID['column'],
    table: 'sp_column',
    data: {
        order: '100',
        size: '12',
        sp_row: 'a4b5c6d7e8067ab290067ab291067ab2',
    },
})

Record({
    $id: Now.ID['instance'],
    table: 'sp_instance',
    data: {
        order: 100,
        sp_column: 'a4b5c6d7e8dad75d0cdad75d0ddad75d',
        sp_widget: 'a4b5c6d7e8ac99e07aac99e07bac99e0',
        title: 'Delivery Methodology',
    },
})
