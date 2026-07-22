import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['theme'],
    table: 'sp_theme',
    data: {
        name: 'Core Theme',
        navbar_fixed: true,
    },
})

Record({
    $id: Now.ID['portal'],
    table: 'sp_portal',
    data: {
        default: false,
        homepage: 'e5f6a7b8c90034628f00112233',
        theme: 'e5f6a7b8c9069375c900112233',
        title: 'Core',
        url_suffix: 'core',
    },
})
