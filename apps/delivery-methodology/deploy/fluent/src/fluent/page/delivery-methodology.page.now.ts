import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['page'],
    table: 'sp_page',
    data: {
        category: 'custom',
        id: 'delivery_methodology',
        internal: false,
        roles: ['x_2168882_dlvry_2.user', 'x_2168882_dlvry_2.editor', 'x_2168882_dlvry_2.admin'],
        short_description: 'Delivery Methodology page',
        title: 'Delivery 2.0',
    },
})

Record({
    $id: Now.ID['container'],
    table: 'sp_container',
    data: {
        bootstrap_alt: false,
        name: 'Delivery 2.0 - Container 1',
        order: 1,
        sp_page: 'a4b5c6d7e8c4a60205c4a60206c4a602',
        width: 'container-fluid',
    },
})

Record({
    $id: Now.ID['row'],
    table: 'sp_row',
    data: {
        order: 1,
        sp_container: 'a4b5c6d7e80c6037770c6037780c6037',
    },
})

Record({
    $id: Now.ID['column'],
    table: 'sp_column',
    data: {
        order: 1,
        size: 12,
        sp_row: 'a4b5c6d7e8067ab290067ab291067ab2',
    },
})

Record({
    $id: Now.ID['instance_shell'],
    table: 'sp_instance',
    data: {
        active: true,
        order: 1,
        sp_column: 'a4b5c6d7e8dad75d0cdad75d0ddad75d',
        sp_widget: 'a4b5c6d7e85271166b5271166c527116',
        title: 'DM Shell',
    },
})

Record({
    $id: Now.ID['instance_methodology'],
    table: 'sp_instance',
    data: {
        active: true,
        order: 2,
        sp_column: 'a4b5c6d7e8dad75d0cdad75d0ddad75d',
        sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a',
        title: 'DM Methodology',
    },
})

Record({
    $id: Now.ID['instance_raci'],
    table: 'sp_instance',
    data: {
        active: true,
        order: 3,
        sp_column: 'a4b5c6d7e8dad75d0cdad75d0ddad75d',
        sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f',
        title: 'DM RACI',
    },
})

Record({
    $id: Now.ID['instance_reference'],
    table: 'sp_instance',
    data: {
        active: true,
        order: 4,
        sp_column: 'a4b5c6d7e8dad75d0cdad75d0ddad75d',
        sp_widget: 'a4b5c6d7e8c3931246c3931247c39312',
        title: 'DM Reference',
    },
})

Record({
    $id: Now.ID['instance_whatsnew'],
    table: 'sp_instance',
    data: {
        active: true,
        order: 5,
        sp_column: 'a4b5c6d7e8dad75d0cdad75d0ddad75d',
        sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48',
        title: 'DM What\'s New',
    },
})
