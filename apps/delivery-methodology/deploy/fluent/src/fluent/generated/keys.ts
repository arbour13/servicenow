import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    acl_sp_column: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e86aa36ebe6aa36ebf6aa36e'
                    }
                    acl_sp_container: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e839d5cb2539d5cb2639d5cb'
                    }
                    acl_sp_instance: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e809e2e43d09e2e43e09e2e4'
                    }
                    acl_sp_page: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e8e46f2fb7e46f2fb8e46f2f'
                    }
                    acl_sp_row: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e850bc803e50bc803f50bc80'
                    }
                    acl_sp_widget: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e8c77a8b2cc77a8b2dc77a8b'
                    }
                    acl_table_content_create: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e890a60ecf90a60ed090a60e'
                    }
                    acl_table_content_delete: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e807ce743e07ce743f07ce74'
                    }
                    acl_table_content_read: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e842686b2942686b2a42686b'
                    }
                    acl_table_content_write: {
                        table: 'sys_security_acl'
                        id: 'a4b5c6d7e81b0ce6b81b0ce6b91b0ce6'
                    }
                    adminGroup: {
                        table: 'sys_user_group'
                        id: 'a4b5c6d7e84bfe45054bfe45064bfe45'
                    }
                    adminGroupRole: {
                        table: 'sys_group_has_role'
                        id: 'a4b5c6d7e865e24adc65e24add65e24a'
                    }
                    adminGroupUserRole: {
                        table: 'sys_group_has_role'
                        id: 'a4b5c6d7e899ff6e7099ff6e7199ff6e'
                    }
                    AppStateService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: '054fd24ff9e8411688b94f5f6448c441'
                    }
                    ChangelogDiffService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8f7371912f7371913f73719'
                    }
                    column: {
                        table: 'sp_column'
                        id: 'a4b5c6d7e8dad75d0cdad75d0ddad75d'
                    }
                    container: {
                        table: 'sp_container'
                        id: 'a4b5c6d7e80c6037770c6037780c6037'
                    }
                    ContentEditService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                    }
                    DataService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8b8715401b8715402b87154'
                    }
                    dmModal: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                    }
                    editorGroup: {
                        table: 'sys_user_group'
                        id: 'a4b5c6d7e8778b6523778b6524778b65'
                    }
                    editorGroupRole: {
                        table: 'sys_group_has_role'
                        id: 'a4b5c6d7e838ba8d7e38ba8d7f38ba8d'
                    }
                    editorGroupUserRole: {
                        table: 'sys_group_has_role'
                        id: 'a4b5c6d7e88271810e8271810f827181'
                    }
                    IconService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8efa70012efa70013efa700'
                    }
                    IdSeqService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                    }
                    instance_methodology: {
                        table: 'sp_instance'
                        id: 'a4b5c6d7e8526ac2af526ac2b0526ac2'
                    }
                    instance_raci: {
                        table: 'sp_instance'
                        id: 'a4b5c6d7e8a7a7f7b5a7a7f7b6a7a7f7'
                    }
                    instance_reference: {
                        table: 'sp_instance'
                        id: 'a4b5c6d7e89c105b179c105b189c105b'
                    }
                    instance_shell: {
                        table: 'sp_instance'
                        id: 'a4b5c6d7e88e4d6fbc8e4d6fbd8e4d6f'
                    }
                    instance_whatsnew: {
                        table: 'sp_instance'
                        id: 'a4b5c6d7e8cd1921f1cd1921f2cd1921'
                    }
                    JargonService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                    }
                    LiveSyncService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8d4e256a4d4e256a5d4e256'
                    }
                    MessagingService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                    }
                    MethodologyDomainService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e88562b3848562b3858562b3'
                    }
                    MotionService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e823fc597523fc597623fc59'
                    }
                    NavigationService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'ace0ba73dd894e58bc91ab3a865e6f5f'
                    }
                    RaciGridService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8304eff10304eff11304eff'
                    }
                    ReferenceService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e87b8295c07b8295c17b8295'
                    }
                    row: {
                        table: 'sp_row'
                        id: 'a4b5c6d7e8067ab290067ab291067ab2'
                    }
                    SearchService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8498b43c3498b43c4498b43'
                    }
                    StructureEditService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8ba87332eba87332fba8733'
                    }
                    ThemeService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                    }
                    TipService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8e4182670e4182671e41826'
                    }
                    UrlPolicyService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                    }
                    userGroup: {
                        table: 'sys_user_group'
                        id: 'a4b5c6d7e86c6cf1816c6cf1826c6cf1'
                    }
                    userGroupRole: {
                        table: 'sys_group_has_role'
                        id: 'a4b5c6d7e8af580be0af580be1af580b'
                    }
                    WhatsNewService: {
                        table: 'sp_angular_provider'
                        id: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                    }
                    widget_methodology: {
                        table: 'sp_widget'
                        id: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                    }
                    widget_raci: {
                        table: 'sp_widget'
                        id: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                    }
                    widget_reference: {
                        table: 'sp_widget'
                        id: 'a4b5c6d7e8c3931246c3931247c39312'
                    }
                    widget_shell: {
                        table: 'sp_widget'
                        id: 'a4b5c6d7e85271166b5271166c527116'
                    }
                    widget_whatsnew: {
                        table: 'sp_widget'
                        id: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                    }
                }
                composite: [
                    {
                        table: 'sys_choice_set'
                        id: '04cbe3bc7d9b455eb6bbe55f9b2fd417'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '0634fb0e36d04513a82d55d3b34650a3'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'level_of_effort'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '1a6706f844d842a48e7898d01ebcdcaa'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'phase'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '1d3ed7ba49724830b6e127538725c371'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '1f5b5530fbec4cdd8fab4a39a253d0cf'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'parent'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '31ac6fa5d2c8447e8351e3d8c06503ab'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'job_aid'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '56c7ffffba1940dabf5e698552717cae'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'order'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '6093215bfdcd4e2a969e547667d89f66'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6210c8dfbdbb40389a3d448e3d825dd9'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'reference_section'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6316822dd3784f2da0cbc4bc8b3ab1d8'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'glossary_term'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '6794557522054be28b0d2997b858b1cb'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'content'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6dccfad6f959464182bfe55fc2592a47'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'comment'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7063b75201a1485db0cef3dc6f0c8f4d'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'raci'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '78021b1863a64a8ba5be40886c01e1f2'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '781f34ef5bed4fad98be15d3d04568ea'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'participant'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '7bda18b2cf5445abb9c6bbd833f93769'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'methodology'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '7e58eecab91a4183828f8a5c45faa483'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8a4238dfecd540d19c2399e830f98299'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8ec5d3aab75f408e98efb6ebf2aef364'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'parent'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '93dc6573e196490881dfdbb7b317422b'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '96365357ec13472f92a60dd99bb8533e'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'changelog_entry'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8005021a0005021a1005021'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e800cd376900cd376a00cd37'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e800cee2de00cee2df00cee2'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e807bc8ae707bc8ae807bc8a'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e80e429e580e429e590e429e'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8116859a4116859a5116859'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e814748a4614748a4714748a'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e814f34b8414f34b8514f34b'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e816cda02916cda02a16cda0'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8d4e256a4d4e256a5d4e256'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e81be0f38d1be0f38e1be0f3'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e81d11656a1d11656b1d1165'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e81d9026a81d9026a91d9026'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e81df085531df085541df085'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e820497c4b20497c4c20497c'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e820e30e8d20e30e8e20e30e'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e82161cfcb2161cfcc2161cf'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8231eb07b231eb07c231eb0'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8239d71b9239d71ba239d71'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8247dceb1247dceb2247dce'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e82759b65a2759b65b2759b6'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8284f77d4284f77d5284f77'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e82a8b19c22a8b19c32a8b19'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e82f740d512f740d522f740d'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8335a1317335a1318335a13'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8351382d3351382d4351382'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e83a1889b03a1889b13a1889'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e83a974aee3a974aef3a974a'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e83c5745ed3c5745ee3c5745'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e84184f2f74184f2f84184f2'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e846776db946776dba46776d'
                        key: {
                            sys_security_acl: 'a4b5c6d7e850bc803e50bc803f50bc80'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8490af9b9490af9ba490af9'
                        key: {
                            sys_security_acl: 'a4b5c6d7e807ce743e07ce743f07ce74'
                            sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8490afd7a490afd7b490afd'
                        key: {
                            sys_security_acl: 'a4b5c6d7e807ce743e07ce743f07ce74'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e84b00aa794b00aa7a4b00aa'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e85009e6665009e6675009e6'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e85088a7a45088a7a55088a7'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8530220c2530220c3530220'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8545dc4c4545dc4c5545dc4'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e857764fad57764fae57764f'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e85c0a43235c0a43245c0a43'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e85c8904615c8904625c8904'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e85cd21c015cd21c025cd21c'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e85d24746e5d24746f5d2474'
                        key: {
                            sys_security_acl: 'a4b5c6d7e842686b2942686b2a42686b'
                            sys_user_role: 'a4b5c6d7e8f5108920f5108921f51089'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e85d24782f5d2478305d2478'
                        key: {
                            sys_security_acl: 'a4b5c6d7e842686b2942686b2a42686b'
                            sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e85d247bf05d247bf15d247b'
                        key: {
                            sys_security_acl: 'a4b5c6d7e842686b2942686b2a42686b'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e86376ac6a6376ac6b6376ac'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e864c1689764c1689864c168'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8650775f9650775fa650775'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e86586373765863738658637'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8688a5ae8688a5ae9688a5a'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e86c73df406c73df416c73df'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e86f79ae666f79ae676f79ae'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8726660f2726660f3726660'
                        key: {
                            sys_security_acl: 'a4b5c6d7e839d5cb2539d5cb2639d5cb'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e873b0da8573b0da8673b0da'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8742f9bc3742f9bc4742f9b'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e87668e1867668e1877668e1'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e87b1d43cc7b1d43cd7b1d43'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e87b57a9ff7b57aa007b57aa'
                        key: {
                            sys_security_acl: 'a4b5c6d7e81b0ce6b81b0ce6b91b0ce6'
                            sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e87b57adc07b57adc17b57ad'
                        key: {
                            sys_security_acl: 'a4b5c6d7e81b0ce6b81b0ce6b91b0ce6'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e87ef3e3577ef3e3587ef3e3'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8d4e256a4d4e256a5d4e256'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8839e170c839e170d839e17'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e885824c0d85824c0e85824c'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e886010d4b86010d4c86010d'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e88616c8818616c8828616c8'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8886fbf79886fbf7a886fbf'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e88c3af2308c3af2318c3af2'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e88ceeb5548ceeb5558ceeb5'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e88d7198a38d7198a48d7198'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e88da014208da014218da014'
                        key: {
                            sys_security_acl: 'a4b5c6d7e8e46f2fb7e46f2fb8e46f2f'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e88df059e18df059e28df059'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8900c9b53900c9b54900c9b'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e892483d4192483d4292483d'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e894de01ea94de01eb94de01'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8979a507f979a5080979a50'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e89d39c6019d39c6029d39c6'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e89f1911929f1911939f1911'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e89f97d2d09f97d2d19f97d2'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8a4375cdaa4375cdba4375c'
                        key: {
                            sys_security_acl: 'a4b5c6d7e809e2e43d09e2e43e09e2e4'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8a61f2f39a61f2f3aa61f2f'
                        key: {
                            sys_security_acl: 'a4b5c6d7e86aa36ebe6aa36ebf6aa36e'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8a6857ad9a6857adaa6857a'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8a7a41363a7a41364a7a413'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8d4e256a4d4e256a5d4e256'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8a822d4a1a822d4a2a822d4'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8d4e256a4d4e256a5d4e256'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8a9421676a9421677a94216'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8aec6f88daec6f88eaec6f8'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8af107caaaf107cabaf107c'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8d4e256a4d4e256a5d4e256'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8af45b9cbaf45b9ccaf45b9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8b11fef85b11fef86b11fef'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8b19eb0c3b19eb0c4b19eb0'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8b63361d4b63361d5b63361'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8b88c58ccb88c58cdb88c58'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8bb2863f0bb2863f1bb2863'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8bbdc8a08bbdc8a09bbdc8a'
                        key: {
                            sys_security_acl: 'a4b5c6d7e890a60ecf90a60ed090a60e'
                            sys_user_role: 'a4b5c6d7e8d464193ed464193fd46419'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8bbdc8dc9bbdc8dcabbdc8d'
                        key: {
                            sys_security_acl: 'a4b5c6d7e890a60ecf90a60ed090a60e'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8bc8407f2bc8407f3bc8407'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8bd11db0bbd11db0cbd11db'
                        key: {
                            sys_security_acl: 'a4b5c6d7e8c77a8b2cc77a8b2dc77a8b'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8bf33732cbf33732dbf3373'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8c04a808bc04a808cc04a80'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8c0c941c9c0c941cac0c941'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'sp_page'
                        id: 'a4b5c6d7e8c4a60205c4a60206c4a602'
                        key: {
                            id: 'delivery_methodology'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8c5e9f60dc5e9f60ec5e9f6'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8c668b74bc668b74cc668b7'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8c7b6e9d2c7b6e9d3c7b6e9'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8cb33cfe9cb33cfeacb33cf'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8cd565f54cd565f55cd565f'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8d0b09e16d0b09e17d0b09e'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8d43102bfd43102c0d43102'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: 'a4b5c6d7e8d464193ed464193fd46419'
                        key: {
                            name: 'delivery_methodology_editor'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8d79ff194d79ff195d79ff1'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8e2da674be2da674ce2da67'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8e3d893fce3d893fde3d893'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8e457553ae457553be45755'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8e53437fee53437ffe53438'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8e5b2f93ce5b2f93de5b2f9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8eb44fd43eb44fd44eb44fd'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8ebc45a3aebc45a3bebc45a'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8eca0a145eca0a146eca0a1'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: 'a4b5c6d7e8f404b51cf404b51df404b5'
                        key: {
                            name: 'delivery_methodology_admin'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8f461355ef461355ff46135'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8f4abd8d3f4abd8d4f4abd8'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_user_role'
                        id: 'a4b5c6d7e8f5108920f5108921f51089'
                        key: {
                            name: 'delivery_methodology_user'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8f832de81f832de82f832de'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8f960ce22f960ce23f960ce'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8f9df8f60f9df8f61f9df8f'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8fa6e806ffa6e8070fa6e80'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4b5c6d7e8fc9b2569fc9b256afc9b25'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'adbbb9c17830409fa5844f3364758c59'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'b77dc95ebdb145fe91caee74c910f53e'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'job_title'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'b7914a84fc1c497cb0d813d229c0cc0c'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'sub_phase'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'bc91c685968544c696115eceacb610f6'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'be9fd3e99a9f460f9d5e9577113c8501'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'input'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'bea9a35799824153b0947695fda90a19'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'task'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'c0c60e18bd1b48219c0c5a111fd02d88'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'meeting'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ce12ce27486e44058b3a6814466e8b13'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'job_aid_role'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'e9c043cc0f6547c4b51a8d531cb81543'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'content'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ef3fb29d80a44d5dbe2feb4cb777ab28'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'type'
                            value: 'deliverable'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'f82bd45b9f714ebf83dc0f2ed17e0b71'
                        key: {
                            name: 'x_2168882_dlvry_2_content'
                            element: 'order'
                            language: 'en'
                        }
                    },
                ]
            }
        }
    }
}
