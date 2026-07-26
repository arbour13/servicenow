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
                    "SchemaService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f68301f1b400112233"
                    }
                    "CodegenService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f68c44ab1200112233"
                    }
                    "AggregateService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f60929801600112233"
                    }
                    "AjaxService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6ad71b05500112233"
                    }
                    "EncoderService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6ed62ee1900112233"
                    }
                    "ScriptIncludeService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6bc950eb800112233"
                    }
                    "GlideQueryService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f68e11bcf200112233"
                    }
                    "StandardsService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f68e2cdc9f00112233"
                    }
                    "ExampleCallService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6c0114acd00112233"
                    }
                    "ConnectionService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6175749d700112233"
                    }
                    "ConnectionUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6e25dc42300112233"
                    }
                    "SchemaLiveService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f60b1b9fa800112233"
                    }
                    "SchemaUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f60dfde8c000112233"
                    }
                    "PreviewUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6b1fbc2b900112233"
                    }
                    "StandardsUiService": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f6fa19c4eb00112233"
                    }
                    "gsSelect": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f62269cd0800112233"
                    }
                    "gsConditionGroups": {
                        table: "sp_angular_provider"
                        id: "b2c3d4e5f69280684300112233"
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
                        id: "b2c3d4e5f64119b7f700112233"
                    }
                    "acl_sp_page": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6fb7154c100112233"
                    }
                    "acl_sp_container": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6eb03f3af00112233"
                    }
                    "acl_sp_row": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f67a171b0800112233"
                    }
                    "acl_sp_column": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f645e7a98800112233"
                    }
                    "acl_sp_widget": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6b117097600112233"
                    }
                    "acl_sp_instance": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6853472c700112233"
                    }
                    "acl_sp_portal": {
                        table: "sys_security_acl"
                        id: "b2c3d4e5f6d36ce39e00112233"
                    }
                    "acl_role_sp_theme": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6784de3be00112233"
                    }
                    "acl_role_sp_page": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6290ab53400112233"
                    }
                    "acl_role_sp_container": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6588c3b0600112233"
                    }
                    "acl_role_sp_row": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f66238c34d00112233"
                    }
                    "acl_role_sp_column": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6a2fd44cd00112233"
                    }
                    "acl_role_sp_widget": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f68fb2a99f00112233"
                    }
                    "acl_role_sp_instance": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f67cc76aee00112233"
                    }
                    "acl_role_sp_portal": {
                        table: "sys_security_acl_role"
                        id: "b2c3d4e5f6df36e87700112233"
                    }
                }
            }
        }
    }
}
