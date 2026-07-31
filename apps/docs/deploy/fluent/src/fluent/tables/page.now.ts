import { Table, ReferenceColumn, StringColumn, IntegerColumn, JsonColumn } from '@servicenow/sdk/core'

export const x_gf_docs_page = Table({
    name: 'x_gf_docs_page',
    label: 'Docs Page',
    schema: {
        group: ReferenceColumn({
            label: 'Group',
            referenceTable: 'x_gf_docs_group',
            cascadeRule: 'cascade',
        }),
        slug: StringColumn({
            label: 'Slug',
            maxLength: 80,
        }),
        title: StringColumn({
            label: 'Title',
            maxLength: 150,
        }),
        order: IntegerColumn({
            label: 'Order',
        }),
        markdown: JsonColumn({
            label: 'Markdown (published)',
        }),
        html: JsonColumn({
            label: 'HTML (published, rendered)',
        }),
        draftMarkdown: JsonColumn({
            label: 'Markdown (draft)',
        }),
        draftHtml: JsonColumn({
            label: 'HTML (draft, rendered)',
        }),
        draftUpdatedBy: StringColumn({
            label: 'Draft last edited by',
            maxLength: 100,
        }),
        draftUpdatedOn: StringColumn({
            label: 'Draft last edited on',
            maxLength: 40,
        }),
    },
})
