import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    'userRole': {
                        table: 'sys_user_role'
                        id: 'e9f0a1b2c3f5108920f5108921f51089'
                    }
                    'editorRole': {
                        table: 'sys_user_role'
                        id: 'e9f0a1b2c3d464193ed464193fd46419'
                    }
                    'adminRole': {
                        table: 'sys_user_role'
                        id: 'e9f0a1b2c3f404b51cf404b51df404b5'
                    }
                    'userGroup': {
                        table: 'sys_user_group'
                        id: 'e9f0a1b2c36c6cf1816c6cf1826c6cf1'
                    }
                    'editorGroup': {
                        table: 'sys_user_group'
                        id: 'e9f0a1b2c3778b6523778b6524778b65'
                    }
                    'adminGroup': {
                        table: 'sys_user_group'
                        id: 'e9f0a1b2c34bfe45054bfe45064bfe45'
                    }
                    'userGroupRole': {
                        table: 'sys_group_has_role'
                        id: 'e9f0a1b2c3af580be0af580be1af580b'
                    }
                    'editorGroupRole': {
                        table: 'sys_group_has_role'
                        id: 'e9f0a1b2c338ba8d7e38ba8d7f38ba8d'
                    }
                    'editorGroupUserRole': {
                        table: 'sys_group_has_role'
                        id: 'e9f0a1b2c38271810e8271810f827181'
                    }
                    'adminGroupRole': {
                        table: 'sys_group_has_role'
                        id: 'e9f0a1b2c365e24adc65e24add65e24a'
                    }
                    'adminGroupUserRole': {
                        table: 'sys_group_has_role'
                        id: 'e9f0a1b2c399ff6e7099ff6e7199ff6e'
                    }
                    'theme': {
                        table: 'sp_theme'
                        id: 'e9f0a1b2c3af8d2ebfaf8d2ec0af8d2e'
                    }
                    'page': {
                        table: 'sp_page'
                        id: 'e9f0a1b2c3c4a60205c4a60206c4a602'
                    }
                    'container': {
                        table: 'sp_container'
                        id: 'e9f0a1b2c30c6037770c6037780c6037'
                    }
                    'row': {
                        table: 'sp_row'
                        id: 'e9f0a1b2c3067ab290067ab291067ab2'
                    }
                    'column': {
                        table: 'sp_column'
                        id: 'e9f0a1b2c3dad75d0cdad75d0ddad75d'
                    }
                    'ThemeService': {
                        table: 'sp_angular_provider'
                        id: 'e9f0a1b2c33d4fdd023d4fdd033d4fdd'
                    }
                    'DocsService': {
                        table: 'sp_angular_provider'
                        id: 'e9f0a1b2c36e2274906e2274916e2274'
                    }
                    'DocsUiService': {
                        table: 'sp_angular_provider'
                        id: 'e9f0a1b2c38cd9471c8cd9471d8cd947'
                    }
                    'widget': {
                        table: 'sp_widget'
                        id: 'e9f0a1b2c3ac99e07aac99e07bac99e0'
                    }
                    'instance': {
                        table: 'sp_instance'
                        id: 'e9f0a1b2c335c3ca8b35c3ca8c35c3ca'
                    }
                    'portal': {
                        table: 'sp_portal'
                        id: 'e9f0a1b2c32b7024a22b7024a32b7024'
                    }
                    'acl_sp_theme': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c3618b9d6d618b9d6e618b9d'
                    }
                    'acl_role_sp_theme_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c31334edaa1334edab1334ed'
                    }
                    'acl_sp_page': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c3e46f2fb7e46f2fb8e46f2f'
                    }
                    'acl_role_sp_page_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c38da014208da014218da014'
                    }
                    'acl_sp_container': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c339d5cb2539d5cb2639d5cb'
                    }
                    'acl_role_sp_container_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3726660f2726660f3726660'
                    }
                    'acl_sp_row': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c350bc803e50bc803f50bc80'
                    }
                    'acl_role_sp_row_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c346776db946776dba46776d'
                    }
                    'acl_sp_column': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c36aa36ebe6aa36ebf6aa36e'
                    }
                    'acl_role_sp_column_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3a61f2f39a61f2f3aa61f2f'
                    }
                    'acl_sp_widget': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c3c77a8b2cc77a8b2dc77a8b'
                    }
                    'acl_role_sp_widget_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3bd11db0bbd11db0cbd11db'
                    }
                    'acl_sp_instance': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c309e2e43d09e2e43e09e2e4'
                    }
                    'acl_role_sp_instance_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3a4375cdaa4375cdba4375c'
                    }
                    'acl_sp_portal': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c3abc27b54abc27b55abc27b'
                    }
                    'acl_role_sp_portal_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3202aede3202aede4202aed'
                    }
                    'acl_table_group_read': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c384dc246384dc246484dc24'
                    }
                    'acl_role_table_group_read_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c345c2c5f445c2c5f545c2c5'
                    }
                    'acl_role_table_group_read_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c345c2c9b545c2c9b645c2c9'
                    }
                    'acl_role_table_group_read_2': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c345c2cd7645c2cd7745c2cd'
                    }
                    'acl_table_group_write': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c3271054be271054bf271054'
                    }
                    'acl_role_table_group_write_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3a6838939a683893aa68389'
                    }
                    'acl_role_table_group_write_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3a6838cfaa6838cfba6838c'
                    }
                    'acl_table_group_create': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c3051061890510618a051061'
                    }
                    'acl_role_table_group_create_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3f62c920ef62c920ff62c92'
                    }
                    'acl_role_table_group_create_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3f62c95cff62c95d0f62c95'
                    }
                    'acl_table_group_delete': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c37c38c6f87c38c6f97c38c6'
                    }
                    'acl_role_table_group_delete_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3835b01bf835b01c0835b01'
                    }
                    'acl_role_table_group_delete_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3835b0580835b0581835b05'
                    }
                    'acl_table_page_read': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c367914c7b67914c7c67914c'
                    }
                    'acl_role_table_page_read_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3c98cd2dcc98cd2ddc98cd2'
                    }
                    'acl_role_table_page_read_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3c98cd69dc98cd69ec98cd6'
                    }
                    'acl_role_table_page_read_2': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3c98cda5ec98cda5fc98cda'
                    }
                    'acl_table_page_write': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c39b002fa69b002fa79b002f'
                    }
                    'acl_role_table_page_write_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c39bfb19519bfb19529bfb19'
                    }
                    'acl_role_table_page_write_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c39bfb1d129bfb1d139bfb1d'
                    }
                    'acl_table_page_create': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c30f1be3a10f1be3a20f1be3'
                    }
                    'acl_role_table_page_create_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3afa704f6afa704f7afa704'
                    }
                    'acl_role_table_page_create_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c3afa708b7afa708b8afa708'
                    }
                    'acl_table_page_delete': {
                        table: 'sys_security_acl'
                        id: 'e9f0a1b2c38644491086444911864449'
                    }
                    'acl_role_table_page_delete_0': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c33cd574a73cd574a83cd574'
                    }
                    'acl_role_table_page_delete_1': {
                        table: 'sys_security_acl_role'
                        id: 'e9f0a1b2c33cd578683cd578693cd578'
                    }
                }
                composite: [
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e9f0a1b2c36ea0c6e16ea0c6e26ea0c6'
                        key: {
                            sp_widget: 'e9f0a1b2c3ac99e07aac99e07bac99e0'
                            sp_angular_provider: 'e9f0a1b2c38cd9471c8cd9471d8cd947'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e9f0a1b2c3d0652f86d0652f87d0652f'
                        key: {
                            sp_widget: 'e9f0a1b2c3ac99e07aac99e07bac99e0'
                            sp_angular_provider: 'e9f0a1b2c36e2274906e2274916e2274'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e9f0a1b2c3d68d42c1d68d42c2d68d42'
                        key: {
                            sp_widget: 'e9f0a1b2c3ac99e07aac99e07bac99e0'
                            sp_angular_provider: 'e9f0a1b2c33d4fdd023d4fdd033d4fdd'
                        }
                    }
                ]
                deleted: {}
            }
        }
    }
}
