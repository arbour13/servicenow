import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    "userRole": {
                        table: "sys_user_role"
                        id: "a4b5c6d7e8f5108920f5108921f51089"
                    }
                    "editorRole": {
                        table: "sys_user_role"
                        id: "a4b5c6d7e8d464193ed464193fd46419"
                    }
                    "adminRole": {
                        table: "sys_user_role"
                        id: "a4b5c6d7e8f404b51cf404b51df404b5"
                    }
                    "userGroup": {
                        table: "sys_user_group"
                        id: "a4b5c6d7e86c6cf1816c6cf1826c6cf1"
                    }
                    "editorGroup": {
                        table: "sys_user_group"
                        id: "a4b5c6d7e8778b6523778b6524778b65"
                    }
                    "adminGroup": {
                        table: "sys_user_group"
                        id: "a4b5c6d7e84bfe45054bfe45064bfe45"
                    }
                    "userGroupRole": {
                        table: "sys_group_has_role"
                        id: "a4b5c6d7e8af580be0af580be1af580b"
                    }
                    "editorGroupRole": {
                        table: "sys_group_has_role"
                        id: "a4b5c6d7e838ba8d7e38ba8d7f38ba8d"
                    }
                    "editorGroupUserRole": {
                        table: "sys_group_has_role"
                        id: "a4b5c6d7e88271810e8271810f827181"
                    }
                    "adminGroupRole": {
                        table: "sys_group_has_role"
                        id: "a4b5c6d7e865e24adc65e24add65e24a"
                    }
                    "adminGroupUserRole": {
                        table: "sys_group_has_role"
                        id: "a4b5c6d7e899ff6e7099ff6e7199ff6e"
                    }
                    "page": {
                        table: "sp_page"
                        id: "a4b5c6d7e8c4a60205c4a60206c4a602"
                    }
                    "container": {
                        table: "sp_container"
                        id: "a4b5c6d7e80c6037770c6037780c6037"
                    }
                    "row": {
                        table: "sp_row"
                        id: "a4b5c6d7e8067ab290067ab291067ab2"
                    }
                    "column": {
                        table: "sp_column"
                        id: "a4b5c6d7e8dad75d0cdad75d0ddad75d"
                    }
                    "ThemeService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e83d4fdd023d4fdd033d4fdd"
                    }
                    "DataService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8b8715401b8715402b87154"
                    }
                    "ChangelogDiffService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8f7371912f7371913f73719"
                    }
                    "RaciGridService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8304eff10304eff11304eff"
                    }
                    "NavigationService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8c274e8d7c274e8d8c274e8"
                    }
                    "SearchService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8498b43c3498b43c4498b43"
                    }
                    "WhatsNewService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2"
                    }
                    "ReferenceService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e87b8295c07b8295c17b8295"
                    }
                    "IdSeqService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8108a2fe7108a2fe8108a2f"
                    }
                    "IconService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8efa70012efa70013efa700"
                    }
                    "TipService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8e4182670e4182671e41826"
                    }
                    "JargonService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc"
                    }
                    "ContentEditService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e83cdfcde83cdfcde93cdfcd"
                    }
                    "StructureEditService": {
                        table: "sp_angular_provider"
                        id: "a4b5c6d7e8ba87332eba87332fba8733"
                    }
                    "widget": {
                        table: "sp_widget"
                        id: "a4b5c6d7e8ac99e07aac99e07bac99e0"
                    }
                    "instance": {
                        table: "sp_instance"
                        id: "a4b5c6d7e835c3ca8b35c3ca8c35c3ca"
                    }
                    "acl_sp_page": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e8e46f2fb7e46f2fb8e46f2f"
                    }
                    "acl_role_sp_page_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e88da014208da014218da014"
                    }
                    "acl_sp_container": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e839d5cb2539d5cb2639d5cb"
                    }
                    "acl_role_sp_container_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8726660f2726660f3726660"
                    }
                    "acl_sp_row": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e850bc803e50bc803f50bc80"
                    }
                    "acl_role_sp_row_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e846776db946776dba46776d"
                    }
                    "acl_sp_column": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e86aa36ebe6aa36ebf6aa36e"
                    }
                    "acl_role_sp_column_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8a61f2f39a61f2f3aa61f2f"
                    }
                    "acl_sp_widget": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e8c77a8b2cc77a8b2dc77a8b"
                    }
                    "acl_role_sp_widget_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8bd11db0bbd11db0cbd11db"
                    }
                    "acl_sp_instance": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e809e2e43d09e2e43e09e2e4"
                    }
                    "acl_role_sp_instance_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8a4375cdaa4375cdba4375c"
                    }
                    "acl_table_content_read": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e842686b2942686b2a42686b"
                    }
                    "acl_role_table_content_read_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e85d24746e5d24746f5d2474"
                    }
                    "acl_role_table_content_read_1": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e85d24782f5d2478305d2478"
                    }
                    "acl_role_table_content_read_2": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e85d247bf05d247bf15d247b"
                    }
                    "acl_table_content_write": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e81b0ce6b81b0ce6b91b0ce6"
                    }
                    "acl_role_table_content_write_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e87b57a9ff7b57aa007b57aa"
                    }
                    "acl_role_table_content_write_1": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e87b57adc07b57adc17b57ad"
                    }
                    "acl_table_content_create": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e890a60ecf90a60ed090a60e"
                    }
                    "acl_role_table_content_create_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8bbdc8a08bbdc8a09bbdc8a"
                    }
                    "acl_role_table_content_create_1": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8bbdc8dc9bbdc8dcabbdc8d"
                    }
                    "acl_table_content_delete": {
                        table: "sys_security_acl"
                        id: "a4b5c6d7e807ce743e07ce743f07ce74"
                    }
                    "acl_role_table_content_delete_0": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8490af9b9490af9ba490af9"
                    }
                    "acl_role_table_content_delete_1": {
                        table: "sys_security_acl_role"
                        id: "a4b5c6d7e8490afd7a490afd7b490afd"
                    }
                }
            }
        }
    }
}
