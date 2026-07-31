import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['userRole'],
    table: 'sys_user_role',
    data: {
        description: 'Can view and use the GlideFast Docs tool.',
    },
})

Record({
    $id: Now.ID['editorRole'],
    table: 'sys_user_role',
    data: {
        description: 'Can save draft edits to GlideFast Docs pages.',
        name: 'glidefast_docs_editor',
    },
})

Record({
    $id: Now.ID['adminRole'],
    table: 'sys_user_role',
    data: {
        description: 'Can save and publish GlideFast Docs pages, and seed standard content.',
        name: 'glidefast_docs_admin',
    },
})

Record({
    $id: Now.ID['userGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can view and use the GlideFast Docs tool.',
    },
})

Record({
    $id: Now.ID['editorGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can edit GlideFast Docs content in the tool.',
        name: 'GlideFast Docs Editors',
    },
})

Record({
    $id: Now.ID['adminGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can edit the GlideFast Docs application.',
        name: 'GlideFast Docs Admins',
    },
})

Record({
    $id: Now.ID['userGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'e9f0a1b2c36c6cf1816c6cf1826c6cf1',
        role: 'e9f0a1b2c3f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['editorGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'e9f0a1b2c3778b6523778b6524778b65',
        role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['editorGroupUserRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'e9f0a1b2c3778b6523778b6524778b65',
        role: 'e9f0a1b2c3f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['adminGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'e9f0a1b2c34bfe45054bfe45064bfe45',
        role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['adminGroupUserRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'e9f0a1b2c34bfe45054bfe45064bfe45',
        role: 'e9f0a1b2c3f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['acl_sp_theme'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_theme records that belong to this application.',
        name: 'sp_theme',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_theme_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3618b9d6d618b9d6e618b9d',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_page'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_page records that belong to this application.',
        name: 'sp_page',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_page_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3e46f2fb7e46f2fb8e46f2f',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_container'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_container records that belong to this application.',
        name: 'sp_container',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_container_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c339d5cb2539d5cb2639d5cb',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_row'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_row records that belong to this application.',
        name: 'sp_row',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_row_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c350bc803e50bc803f50bc80',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_column'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_column records that belong to this application.',
        name: 'sp_column',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_column_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c36aa36ebe6aa36ebf6aa36e',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_widget'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_widget records that belong to this application.',
        name: 'sp_widget',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_widget_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3c77a8b2cc77a8b2dc77a8b',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_instance'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_instance records that belong to this application.',
        name: 'sp_instance',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_instance_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c309e2e43d09e2e43e09e2e4',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_sp_portal'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=e9f0a1b2c3058b7d17058b7d18058b7d',
        description: 'Lets glidefast_docs_admin edit sp_portal records that belong to this application.',
        name: 'sp_portal',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_portal_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3abc27b54abc27b55abc27b',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_group_read'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets undefined/glidefast_docs_editor/glidefast_docs_admin read Docs Group rows.',
        name: 'x_gf_docs_group',
        operation: 'read',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_read_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c384dc246384dc246484dc24',
        sys_user_role: 'e9f0a1b2c3f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_read_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c384dc246384dc246484dc24',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_read_2'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c384dc246384dc246484dc24',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_group_write'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets glidefast_docs_editor/glidefast_docs_admin write Docs Group rows.',
        name: 'x_gf_docs_group',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_write_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3271054be271054bf271054',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_write_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3271054be271054bf271054',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_group_create'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets glidefast_docs_editor/glidefast_docs_admin create Docs Group rows.',
        name: 'x_gf_docs_group',
        operation: 'create',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_create_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3051061890510618a051061',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_create_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c3051061890510618a051061',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_group_delete'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets glidefast_docs_editor/glidefast_docs_admin delete Docs Group rows.',
        name: 'x_gf_docs_group',
        operation: 'delete',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_delete_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c37c38c6f87c38c6f97c38c6',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_group_delete_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c37c38c6f87c38c6f97c38c6',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_page_read'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets undefined/glidefast_docs_editor/glidefast_docs_admin read Docs Page rows.',
        name: 'x_gf_docs_page',
        operation: 'read',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_read_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c367914c7b67914c7c67914c',
        sys_user_role: 'e9f0a1b2c3f5108920f5108921f51089',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_read_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c367914c7b67914c7c67914c',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_read_2'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c367914c7b67914c7c67914c',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_page_write'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets glidefast_docs_editor/glidefast_docs_admin write Docs Page rows.',
        name: 'x_gf_docs_page',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_write_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c39b002fa69b002fa79b002f',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_write_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c39b002fa69b002fa79b002f',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_page_create'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets glidefast_docs_editor/glidefast_docs_admin create Docs Page rows.',
        name: 'x_gf_docs_page',
        operation: 'create',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_create_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c30f1be3a10f1be3a20f1be3',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_create_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c30f1be3a10f1be3a20f1be3',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})

Record({
    $id: Now.ID['acl_table_page_delete'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        description: 'Lets glidefast_docs_editor/glidefast_docs_admin delete Docs Page rows.',
        name: 'x_gf_docs_page',
        operation: 'delete',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_delete_0'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c38644491086444911864449',
        sys_user_role: 'e9f0a1b2c3d464193ed464193fd46419',
    },
})

Record({
    $id: Now.ID['acl_role_table_page_delete_1'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'e9f0a1b2c38644491086444911864449',
        sys_user_role: 'e9f0a1b2c3f404b51cf404b51df404b5',
    },
})
