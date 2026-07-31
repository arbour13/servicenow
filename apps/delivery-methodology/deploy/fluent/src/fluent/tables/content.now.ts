import { Table, ChoiceColumn, ReferenceColumn, StringColumn, IntegerColumn, JsonColumn } from '@servicenow/sdk/core'

export const x_2168882_dlvry_2_content = Table({
    name: 'x_2168882_dlvry_2_content',
    label: 'Content',
    schema: {
        type: ChoiceColumn({
            label: 'Type',
            choices: {
            "methodology": 'Methodology',
            "phase": 'Phase',
            "sub_phase": 'Sub-phase',
            "task": 'Task',
            "raci": 'RACI',
            "job_aid": 'Job aid',
            "job_aid_role": 'Job aid role',
            "input": 'Input',
            "deliverable": 'Deliverable',
            "comment": 'Comment',
            "participant": 'Participant',
            "meeting": 'Meeting',
            "level_of_effort": 'Level of effort',
            "changelog_entry": 'Changelog entry',
            "job_title": 'Job title',
            "glossary_term": 'Glossary term',
            "reference_section": 'Reference section',
        },
        }),
        parent: ReferenceColumn({
            label: 'Parent',
            referenceTable: 'x_2168882_dlvry_2_content',
            cascadeRule: 'cascade',
        }),
        name: StringColumn({
            label: 'Name',
            maxLength: 150,
        }),
        order: IntegerColumn({
            label: 'Order',
        }),
        content: JsonColumn({
            label: 'Content',
        }),
    },
})
