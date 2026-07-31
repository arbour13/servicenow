import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['userRole'],
    table: 'sys_user_role',
    data: {
        description: 'Can view the Delivery Methodology tool (read-only).',
        name: 'x_2168882_dlvry_2.user',
    },
})

Record({
    $id: Now.ID['editorRole'],
    table: 'sys_user_role',
    data: {
        description: 'Can edit Delivery Methodology content in the tool.',
        name: 'x_2168882_dlvry_2.editor',
    },
})

Record({
    $id: Now.ID['adminRole'],
    table: 'sys_user_role',
    data: {
        description: 'Can edit Delivery Methodology content and the application’s own records.',
        name: 'x_2168882_dlvry_2.admin',
    },
})

Record({
    $id: Now.ID['userGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can view and use the Delivery Methodology tool.',
        name: 'Delivery Methodology Users',
    },
})

Record({
    $id: Now.ID['editorGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can edit Delivery Methodology content in the tool.',
        name: 'Delivery Methodology Editors',
    },
})

Record({
    $id: Now.ID['adminGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can edit the Delivery Methodology application.',
        name: 'Delivery Methodology Admins',
    },
})

Record({
    $id: Now.ID['userGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'a4b5c6d7e86c6cf1816c6cf1826c6cf1',
        role: 'a4b5c6d7e8f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['editorGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'a4b5c6d7e8778b6523778b6524778b65',
        role: 'a4b5c6d7e8d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['editorGroupUserRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'a4b5c6d7e8778b6523778b6524778b65',
        role: 'a4b5c6d7e8f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['adminGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'a4b5c6d7e84bfe45054bfe45064bfe45',
        role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['adminGroupUserRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'a4b5c6d7e84bfe45054bfe45064bfe45',
        role: 'a4b5c6d7e8f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['acl_sp_page'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=a4b5c6d7e8058b7d17058b7d18058b7d',
        description: 'Lets x_2168882_dlvry_2.admin edit sp_page records that belong to this application.',
        name: 'sp_page',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_page_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e8e46f2fb7e46f2fb8e46f2f',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_container'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=a4b5c6d7e8058b7d17058b7d18058b7d',
        description: 'Lets x_2168882_dlvry_2.admin edit sp_container records that belong to this application.',
        name: 'sp_container',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_container_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e839d5cb2539d5cb2639d5cb',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_row'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=a4b5c6d7e8058b7d17058b7d18058b7d',
        description: 'Lets x_2168882_dlvry_2.admin edit sp_row records that belong to this application.',
        name: 'sp_row',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_row_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e850bc803e50bc803f50bc80',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_column'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=a4b5c6d7e8058b7d17058b7d18058b7d',
        description: 'Lets x_2168882_dlvry_2.admin edit sp_column records that belong to this application.',
        name: 'sp_column',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_column_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e86aa36ebe6aa36ebf6aa36e',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_widget'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=a4b5c6d7e8058b7d17058b7d18058b7d',
        description: 'Lets x_2168882_dlvry_2.admin edit sp_widget records that belong to this application.',
        name: 'sp_widget',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_widget_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e8c77a8b2cc77a8b2dc77a8b',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_instance'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=a4b5c6d7e8058b7d17058b7d18058b7d',
        description: 'Lets x_2168882_dlvry_2.admin edit sp_instance records that belong to this application.',
        name: 'sp_instance',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_instance_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e809e2e43d09e2e43e09e2e4',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_content_read'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets x_2168882_dlvry_2.user/x_2168882_dlvry_2.editor/x_2168882_dlvry_2.admin read Content rows.',
        name: 'x_2168882_dlvry_2_content',
        operation: 'read',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_read_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e842686b2942686b2a42686b',
        sys_user_role: 'a4b5c6d7e8f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_read_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e842686b2942686b2a42686b',
        sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_read_2'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e842686b2942686b2a42686b',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_content_write'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets x_2168882_dlvry_2.editor/x_2168882_dlvry_2.admin write Content rows.',
        name: 'x_2168882_dlvry_2_content',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_write_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e81b0ce6b81b0ce6b91b0ce6',
        sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_write_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e81b0ce6b81b0ce6b91b0ce6',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_content_create'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets x_2168882_dlvry_2.editor/x_2168882_dlvry_2.admin create Content rows.',
        name: 'x_2168882_dlvry_2_content',
        operation: 'create',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_create_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e890a60ecf90a60ed090a60e',
        sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_create_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e890a60ecf90a60ed090a60e',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_content_delete'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets x_2168882_dlvry_2.editor/x_2168882_dlvry_2.admin delete Content rows.',
        name: 'x_2168882_dlvry_2_content',
        operation: 'delete',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_delete_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e807ce743e07ce743f07ce74',
        sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_content_delete_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'a4b5c6d7e807ce743e07ce743f07ce74',
        sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5',
    },
})
