import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['theme'],
    table: 'sp_theme',
    data: {
        name: 'GlideFast Standards Portal Theme',
        navbar_fixed: true,
    },
})

Record({
    $id: Now.ID['portal'],
    table: 'sp_portal',
    data: {
        default: false,
        homepage: 'c7d8e9f0a10000112233440005',
        theme: 'c7d8e9f0a10000112233440003',
        title: 'GlideFast Standards Portal',
        url_suffix: 'glidefast-standards',
    },
})
