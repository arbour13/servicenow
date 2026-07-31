import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['theme'],
    table: 'sp_theme',
    data: {
        name: 'GlideFast Docs Theme',
        navbar_fixed: true,
    },
})

Record({
    $id: Now.ID['portal'],
    table: 'sp_portal',
    data: {
        default: false,
        homepage: 'e9f0a1b2c3c4a60205c4a60206c4a602',
        theme: 'e9f0a1b2c3af8d2ebfaf8d2ec0af8d2e',
        title: 'GlideFast Docs',
        url_suffix: 'glidefast-docs',
    },
})
