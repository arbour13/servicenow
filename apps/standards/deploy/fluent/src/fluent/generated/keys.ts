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
                        id: "c7d8e9f0a13d4fdd023d4fdd033d4fdd"
                    }
                    "StandardsService": {
                        table: "sp_angular_provider"
                        id: "c7d8e9f0a1b6683815b6683816b66838"
                    }
                    "StandardsUiService": {
                        table: "sp_angular_provider"
                        id: "c7d8e9f0a1dabc3d61dabc3d62dabc3d"
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
