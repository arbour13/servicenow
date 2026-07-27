import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
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
                    "widget": {
                        table: "sp_widget"
                        id: "a4b5c6d7e8ac99e07aac99e07bac99e0"
                    }
                    "instance": {
                        table: "sp_instance"
                        id: "a4b5c6d7e835c3ca8b35c3ca8c35c3ca"
                    }
                }
            }
        }
    }
}
