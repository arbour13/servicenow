import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['theme'],
    table: 'sp_theme',
    data: {
        name: 'Glide Studio Theme',
        navbar_fixed: true,
    },
})

Record({
    $id: Now.ID['portal'],
    table: 'sp_portal',
    data: {
        default: false,
        homepage: 'b2c3d4e5f60000112233445566778805',
        theme: 'b2c3d4e5f60000112233445566778803',
        title: 'Glide Studio',
        url_suffix: 'glide-studio-ng',
    },
})
