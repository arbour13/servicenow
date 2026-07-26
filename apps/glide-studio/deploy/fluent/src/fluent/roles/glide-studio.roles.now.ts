import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['userRole'],
    table: 'sys_user_role',
    data: {
        active: true,
        description: 'Can view and use the Glide Studio tool.',
        name: 'glide_studio_user',
    },
})

Record({
    $id: Now.ID['adminRole'],
    table: 'sys_user_role',
    data: {
        active: true,
        description: 'Can edit Glide Studio\'s own application records (widget, page, theme, layout).',
        name: 'glide_studio_admin',
    },
})

Record({
    $id: Now.ID['userGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can view and use the Glide Studio tool.',
        name: 'Glide Studio Users',
    },
})

Record({
    $id: Now.ID['adminGroup'],
    table: 'sys_user_group',
    data: {
        active: true,
        description: 'Members can edit the Glide Studio application.',
        name: 'Glide Studio Admins',
    },
})

Record({
    $id: Now.ID['userGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'b2c3d4e5f6000011223344556677880e',
        role: 'b2c3d4e5f6000011223344556677880c',
    },
})

Record({
    $id: Now.ID['adminGroupRole'],
    table: 'sys_group_has_role',
    data: {
        group: 'b2c3d4e5f6000011223344556677880f',
        role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_sp_theme'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_theme records that belong to this application.',
        name: 'sp_theme',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_page'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_page records that belong to this application.',
        name: 'sp_page',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_container'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_container records that belong to this application.',
        name: 'sp_container',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_row'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_row records that belong to this application.',
        name: 'sp_row',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_column'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_column records that belong to this application.',
        name: 'sp_column',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_widget'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_widget records that belong to this application.',
        name: 'sp_widget',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_instance'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_instance records that belong to this application.',
        name: 'sp_instance',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_sp_portal'],
    table: 'sys_security_acl',
    data: {
        active: true,
        admin_overrides: false,
        condition: 'sys_scope=b2c3d4e5f60000112233445566778801',
        description: 'Lets glide_studio_admin edit sp_portal records that belong to this application.',
        name: 'sp_portal',
        operation: 'write',
        type: 'record',
    },
})

Record({
    $id: Now.ID['acl_role_sp_theme'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f6618b9d6d618b9d6e618b9d',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_page'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f6e46f2fb7e46f2fb8e46f2f',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_container'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f639d5cb2539d5cb2639d5cb',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_row'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f650bc803e50bc803f50bc80',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_column'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f66aa36ebe6aa36ebf6aa36e',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_widget'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f6c77a8b2cc77a8b2dc77a8b',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_instance'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f609e2e43d09e2e43e09e2e4',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})

Record({
    $id: Now.ID['acl_role_sp_portal'],
    table: 'sys_security_acl_role',
    data: {
        sys_security_acl: 'b2c3d4e5f6abc27b54abc27b55abc27b',
        sys_user_role: 'b2c3d4e5f6000011223344556677880d',
    },
})
