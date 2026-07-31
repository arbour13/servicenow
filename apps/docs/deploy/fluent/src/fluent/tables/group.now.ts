import { Table, StringColumn, IntegerColumn, JsonColumn } from '@servicenow/sdk/core'

export const x_gf_docs_group = Table({
    name: 'x_gf_docs_group',
    label: 'Docs Group',
    schema: {
        slug: StringColumn({
            label: 'Slug',
            maxLength: 60,
        }),
        title: StringColumn({
            label: 'Title',
            maxLength: 150,
        }),
        order: IntegerColumn({
            label: 'Order',
        }),
        planned: JsonColumn({
            label: 'Planned page titles',
        }),
    },
})
