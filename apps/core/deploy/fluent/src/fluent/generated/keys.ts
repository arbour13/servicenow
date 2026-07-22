import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    "theme": {
                        table: "sp_theme"
                        id: "e5f6a7b8c9069375c900112233"
                    }
                    "page": {
                        table: "sp_page"
                        id: "e5f6a7b8c90034628f00112233"
                    }
                    "container": {
                        table: "sp_container"
                        id: "e5f6a7b8c9e7814c8100112233"
                    }
                    "row": {
                        table: "sp_row"
                        id: "e5f6a7b8c90001b9da00112233"
                    }
                    "column": {
                        table: "sp_column"
                        id: "e5f6a7b8c9af3ed35600112233"
                    }
                    "ThemeService": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c95aa2d8cc00112233"
                    }
                    "ConfirmModalService": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c9bc325a0800112233"
                    }
                    "DocViewerService": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c968a83e0b00112233"
                    }
                    "coreModal": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c9a06a464e00112233"
                    }
                    "coreSyncAttr": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c940aba7eb00112233"
                    }
                    "coreDoc": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c938e8451900112233"
                    }
                    "CoreDocsService": {
                        table: "sp_angular_provider"
                        id: "e5f6a7b8c905b85abb00112233"
                    }
                    "widget": {
                        table: "sp_widget"
                        id: "e5f6a7b8c9d1075a4400112233"
                    }
                    "instance": {
                        table: "sp_instance"
                        id: "e5f6a7b8c92116949500112233"
                    }
                    "portal": {
                        table: "sp_portal"
                        id: "e5f6a7b8c9c570886c00112233"
                    }
                }
            }
        }
    }
}
