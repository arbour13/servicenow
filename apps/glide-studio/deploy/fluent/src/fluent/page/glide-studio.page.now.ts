import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['page'],
    table: 'sp_page',
    data: {
        category: 'custom',
        id: 'x_glide_studio_ng_page',
        internal: false,
        roles: 'b2c3d4e5f6000011223344556677880c',
        short_description: 'Glide Studio page',
        title: 'Glide Studio',
    },
})

Record({
    $id: Now.ID['container'],
    table: 'sp_container',
    data: {
        bootstrap_alt: 'false',
        name: 'Glide Studio',
        order: '100',
        sp_page: 'b2c3d4e5f60000112233445566778805',
        width: 'container-fluid',
    },
})

Record({
    $id: Now.ID['row'],
    table: 'sp_row',
    data: {
        order: '100',
        sp_container: 'b2c3d4e5f60000112233445566778806',
    },
})

Record({
    $id: Now.ID['column'],
    table: 'sp_column',
    data: {
        order: '100',
        size: '12',
        sp_row: 'b2c3d4e5f60000112233445566778807',
    },
})

Record({
    $id: Now.ID['instance'],
    table: 'sp_instance',
    data: {
        order: 100,
        sp_column: 'b2c3d4e5f60000112233445566778808',
        sp_widget: 'b2c3d4e5f60000112233445566778802',
        title: 'Glide Studio',
    },
})
