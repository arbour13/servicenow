import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    "theme": {
                        table: "sp_theme"
                        id: "c7d8e9f0a10000112233440003"
                    }
                    "page": {
                        table: "sp_page"
                        id: "c7d8e9f0a10000112233440005"
                    }
                    "container": {
                        table: "sp_container"
                        id: "c7d8e9f0a10000112233440006"
                    }
                    "row": {
                        table: "sp_row"
                        id: "c7d8e9f0a10000112233440007"
                    }
                    "column": {
                        table: "sp_column"
                        id: "c7d8e9f0a10000112233440008"
                    }
                    "ThemeService": {
                        table: "sp_angular_provider"
                        id: "c7d8e9f0a15aa2d8cc00112233"
                    }
                    "StandardsService": {
                        table: "sp_angular_provider"
                        id: "c7d8e9f0a18e2cdc9f00112233"
                    }
                    "StandardsUiService": {
                        table: "sp_angular_provider"
                        id: "c7d8e9f0a1fa19c4eb00112233"
                    }
                    "widget": {
                        table: "sp_widget"
                        id: "c7d8e9f0a10000112233440002"
                    }
                    "instance": {
                        table: "sp_instance"
                        id: "c7d8e9f0a10000112233440009"
                    }
                    "portal": {
                        table: "sp_portal"
                        id: "c7d8e9f0a10000112233440004"
                    }
                }
            }
        }
    }
}
