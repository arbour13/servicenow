import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    "userRole": {
                        table: "sys_user_role"
                        id: "b2c3d4e5f6000011223344556677880c"
                    }
                    "adminRole": {
                        table: "sys_user_role"
                        id: "b2c3d4e5f6000011223344556677880d"
                    }
                    "userGroup": {
                        table: "sys_user_group"
                        id: "b2c3d4e5f6000011223344556677880e"
                    }
                    "adminGroup": {
                        table: "sys_user_group"
                        id: "b2c3d4e5f6000011223344556677880f"
                    }
                    "userGroupRole": {
                        table: "sys_group_has_role"
                        id: "b2c3d4e5f60000112233445566778810"
                    }
                    "adminGroupRole": {
                        table: "sys_group_has_role"
                        id: "b2c3d4e5f60000112233445566778811"
                    }
                    "theme": {
                        table: "sp_theme"
                        id: "b2c3d4e5f60000112233445566778803"
                    }
                    "page": {
                        table: "sp_page"
                        id: "b2c3d4e5f60000112233445566778805"
                    }
                    "container": {
                        table: "sp_container"
                        id: "b2c3d4e5f60000112233445566778806"
                    }
                    "row": {
                        table: "sp_row"
                        id: "b2c3d4e5f60000112233445566778807"
                    }
                    "column": {
                        table: "sp_column"
                        id: "b2c3d4e5f60000112233445566778808"
                    }
                    "ThemeService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f63d4fdd023d4fdd033d4fdd"
                    }
                    "ConfirmModalService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f67903ff3e7903ff3f7903ff"
                    }
                    "gsModal": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6fe087417fe087418fe0874"
                    }
                    "gsSyncAttr": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6d0ac416ed0ac416fd0ac41"
                    }
                    "SchemaService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6ca4c5beaca4c5bebca4c5b"
                    }
                    "CodegenService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f68dc635c88dc635c98dc635"
                    }
                    "AggregateService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f664c9d9cc64c9d9cd64c9d9"
                    }
                    "AjaxService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f617c6f64b17c6f64c17c6f6"
                    }
                    "EncoderService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6205fd30f205fd310205fd3"
                    }
                    "ScriptIncludeService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6eb8c47eeeb8c47efeb8c47"
                    }
                    "GlideQueryService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f650964fa850964fa950964f"
                    }
                    "StandardsService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6b6683815b6683816b66838"
                    }
                    "ExampleCallService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f600e9d2c300e9d2c400e9d2"
                    }
                    "ConnectionService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f69eac374d9eac374e9eac37"
                    }
                    "ConnectionUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6c1fd4e99c1fd4e9ac1fd4e"
                    }
                    "SchemaLiveService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6b2b25cdeb2b25cdfb2b25c"
                    }
                    "SchemaUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f68626bff68626bff78626bf"
                    }
                    "PreviewUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f62215ffaf2215ffb02215ff"
                    }
                    "StandardsUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6dabc3d61dabc3d62dabc3d"
                    }
                    "gsSelect": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f62f2ab23e2f2ab23f2f2ab2"
                    }
                    "gsConditionGroups": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6f4076ab9f4076abaf4076a"
                    }
                    "widget": {
                        table: "sp_widget"
                        id: "b2c3d4e5f60000112233445566778802"
                    }
                    "instance": {
                        table: "sp_instance"
                        id: "b2c3d4e5f60000112233445566778809"
                    }
                    "portal": {
                        table: "sp_portal"
                        id: "b2c3d4e5f60000112233445566778804"
                    }
                    "acl_sp_theme": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6618b9d6d618b9d6e618b9d"
                    }
                    "acl_sp_page": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6e46f2fb7e46f2fb8e46f2f"
                    }
                    "acl_sp_container": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f639d5cb2539d5cb2639d5cb"
                    }
                    "acl_sp_row": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f650bc803e50bc803f50bc80"
                    }
                    "acl_sp_column": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f66aa36ebe6aa36ebf6aa36e"
                    }
                    "acl_sp_widget": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6c77a8b2cc77a8b2dc77a8b"
                    }
                    "acl_sp_instance": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f609e2e43d09e2e43e09e2e4"
                    }
                    "acl_sp_portal": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6abc27b54abc27b55abc27b"
                    }
                    "acl_role_sp_theme": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f69c63f3749c63f3759c63f3"
                    }
                    "acl_role_sp_page": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f611323f6a11323f6b11323f"
                    }
                    "acl_role_sp_container": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6666998bc666998bd666998"
                    }
                    "acl_role_sp_row": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6b7152b43b7152b44b7152b"
                    }
                    "acl_role_sp_column": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6d8bf4cc3d8bf4cc4d8bf4c"
                    }
                    "acl_role_sp_widget": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f66daec5156daec5166daec5"
                    }
                    "acl_role_sp_instance": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f668986ea468986ea568986e"
                    }
                    "acl_role_sp_portal": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6ed1eadeded1eadeeed1ead"
                    }
                }
            }
        }
    }
}
