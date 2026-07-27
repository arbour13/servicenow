import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['theme'],
    table: 'sp_theme',
    data: {
        name: 'Delivery Methodology Theme',
        navbar_fixed: true,
    },
})

Record({
    $id: Now.ID['portal'],
    table: 'sp_portal',
    data: {
        default: false,
        homepage: 'a4b5c6d7e8c4a60205c4a60206c4a602',
        theme: 'a4b5c6d7e8af8d2ebfaf8d2ec0af8d2e',
        title: 'Delivery Methodology',
        url_suffix: 'delivery-methodology',
    },
})
