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
                        id: '56ea1c06b89f4217b7c2deb2db8fef5c'
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
                        id: '2da4a22a305945a5a098fcfb0036c76a'
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
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '015b768c50e649b290da86106086868f'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '02aba32dc43f4017a95b5b6dc8f63838'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '030c5b2e7d864700a7dc3aa253cfcf2c'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '03498a67eeed49a98d8518ba8948d6a2'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0357345dc68a4de09f6cb40f44190e8b'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '05468a548c7a49b39fa43e777a5751f1'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0661a14e9ae54b20a950a860b69f4263'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0891d48149fc47d4842cbee98825585f'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '08be4d4c86b541bea94025fd3bbd55d3'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'sub_phase'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0b5687b78da34f23a21354f6ea794a1f'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0c09830768554989a92b70aa38033b23'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0e62ee90135e48f0a6d739b8725f740f'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '0fae07f0fd71480193692bcbb0a41fcb'
                        key: {
                            name: 'x_dlvry_method_content'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '102c18b44d574bb690af5c78ca16706e'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '10dcb5f265d4499387a2642851125279'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '138d6edc3eaf49408adba53e3ddaece1'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '143842d5e6e74b58a45c13ab747e9c2c'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '1502ae50e71c4ae28761b7fab8738a11'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '177b63f66a1d4cd4b408dea78a66970f'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '178e634fc222480da78220216cd408a8'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '18349fb4b1d24afab67be2cab87f0ebd'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'changelog_entry'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '1d3ad8786aad4319994f8129779cca6f'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '1de09087079e47b5bcf67b196132cbe3'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'job_aid'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '1f4821ab471949feb328f1a43a7a8477'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'glossary_term'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '24593dc86cc84e0a9ee31768169118fe'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '258c38e25b044a689043eb4951c367e1'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '30a347e486974274bf7254cc91256f1a'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '3231609dd04c4f5f8e1dbba6ee942ca9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '3238cc0bb19e4ef0aacbf10f660c10d3'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '37b517347f4f4f168c95e593e8a49107'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'name'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '38445971190d4356aaf6a03bda01f582'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '3c2d4a7f7951408190cce604d1c07947'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '3dda00d143ef4ea6974aaae114870b8a'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'level_of_effort'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '3e0121f7014747918e8a9ed8459c14c9'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'participant'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3e23ab37603743a6a2dc251b4b1f9ffe'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'order'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3f6086b1db344a9dbee7c2a1fc313e67'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'order'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '3fb62bf73a2e4df3acbcba6bfa362e70'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '40645247ec904a62979ae21c309143de'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '459008a292064799957aff819874b5a3'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'task'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '46fc23feff82488ca21861b8a91add2d'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '478396442c7e40a1a1ac6aa283edced5'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '482d9139e34347d2bd74fbc918a411ec'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'content'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '48a8568a33c24f3aa6d8639eee47a0aa'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '493227ac29cc4a898d660e9bf0b5f32a'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '49645bd975f744219c025a6221243958'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '4af6f5046c6f49d0bc5bfe1529208b3b'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'raci'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '4f3dcc0f606c449cbc641bdec2bea1db'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '53c18299d4084e0bb0a52e243064daae'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'job_aid_role'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '557d089ad71c428e9a05898dd6e69408'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '558a2113bab24784ba6efd969abf01a9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '56707d7ab072460d9b1ab6cbab0c4ca3'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '5674804add2f4e45977f93c3edeb316c'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '5c0cd6b16ef94f2387015086f0f401be'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '65677b09fe7242dbb626e765fb9082c0'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '65cf885001b34a898367cb8813559a67'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '666403d2ff334ff8b11f8fcf539a3fba'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '687769e8cee04f72ba948b5bc0bbc3cd'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'deliverable'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '6a004c3ac3fa4aec98b70977ebcd1323'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '6aae6dd2798847278db3c623e94d3a66'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '6fddc7d053a440658d8e2fe0e2c21b75'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '7028ff1aab0345878321d2b022802372'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '72535ee4a7aa4d82a5b30a7041718743'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '7278a80b3f044180b113cfe7131213a5'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '738627af3970455fafaa493d3978194b'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '73fa33f826994809aaa58b7f5c198ada'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '74c38885d09a42c99c000e89a7984020'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'parent'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '74db40eeb85c4c9d8a0737c6716d6f3b'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '751278d7369d42d9b29a762d8f24affe'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '754bece6daa040ec8fb63fadceeb6375'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '7932da1b0f8b488a9d4393768e4c0ba5'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '79930ba73df545dc96a2d46b828b90c7'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '7cef2530fc86448bbf53de8a2e9eaa82'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '800456fac8a3485183b036677ec9008a'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '808d080ff4c0478b953b6a61acb85c93'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '80f75467c97a4ebea44db44de063e1fb'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '8c2cd5762444440e80da3cb08288e5e8'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '8eced71004c3460a9ba1c5f6427c5952'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'input'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '8f65ee21ad0f4b15bd044e9d18d06fc1'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '921d5a8170ef4423a94af2330f4f94b0'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '927fa9f947894027ba953a219876c51c'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'job_title'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '994a5670df4446a6ac48b882aaadd9f4'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '99cf3299cbdc44a3898b275a9bde4716'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '99f2de27c8084152b1b27f46daeb9f2b'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '9b9f6b8688da45978a4da44702c8752a'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '9d921b86b578492ebb48615d475fb1e3'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a0d648df207349eab60fe0f7d44281c6'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a210548f65c846d0bcf07acda4fe57b8'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a276d3f78cb54915ac66bfeac6236a81'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
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
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8726660f2726660f3726660'
                        key: {
                            sys_security_acl: 'a4b5c6d7e839d5cb2539d5cb2639d5cb'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
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
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e88da014208da014218da014'
                        key: {
                            sys_security_acl: 'a4b5c6d7e8e46f2fb7e46f2fb8e46f2f'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
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
                        table: 'sys_security_acl_role'
                        id: 'a4b5c6d7e8bd11db0bbd11db0cbd11db'
                        key: {
                            sys_security_acl: 'a4b5c6d7e8c77a8b2cc77a8b2dc77a8b'
                            sys_user_role: 'a4b5c6d7e8f404b51cf404b51df404b5'
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
                        table: 'sys_user_role'
                        id: 'a4b5c6d7e8d464193ed464193fd46419'
                        key: {
                            name: 'delivery_methodology_editor'
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
                        table: 'sys_user_role'
                        id: 'a4b5c6d7e8f5108920f5108921f51089'
                        key: {
                            name: 'delivery_methodology_user'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a9039b44c1994dbc866e7393d0b499e9'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ab1b2046ea54492a925811ecc5f8ccfa'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'aba50fb7475b45a39b0e4698895845f8'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'content'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'aca913e7fd6f4f58a79a19e01d028f74'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'af4246881d8f457c88d4c51295378d86'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'b353f328f2484e9c9d9736aaa21fee8c'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'phase'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'b689bf5ec10a428e88e8b028cb645ed3'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'meeting'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'b6d1d11fb39c4a1fbe1eff2506bec9b9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'ba1e9240e66f491cb0cc3a8bd588dc19'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'methodology'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'c32577c535034dc289f9801c5bc40482'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'reference_section'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c3af7f9e4aa145f988d3e3a70503fef9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c3e8c24b0a6f4e17aac7020f1283812c'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c47be409b8c94c2e949c1ab7aff65c0f'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c5cff06457604c2daf809f0057efdb4d'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'parent'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c68ea5322777464488de78ea664ea04d'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c6e6530893da441d8d58de99ff4b362f'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'cb4a14ee2dee4c97b86537e8664e8f78'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'cb98e72b954047b28051c2e315d8c861'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ce4c2f9188604c708749a0a400e16f11'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'cf7c6a0357a745f5a46e7c8688c76afa'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'cf8cf328fddc40fd98858ae4da0076c4'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd2426b7a37da4d85b088928420382869'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd2677a3b0a934433b7702175be0469a7'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd576aff1ce5140c3b748c69be693517b'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd64330b595f94a6b91b800e87905bea2'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'd8f36bac778d4fcd8c1caf63a3cf160a'
                        key: {
                            name: 'x_dlvry_method_content'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd94870b258ca4a578098e99a9752e606'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'dad3330c7016445bbad4163e091d30f4'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'dc4714fa18ad4e4d9a11ad7dc7c89161'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'dc9d5a56d41b4b5e86f895f39365ee4b'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'de310577b0d44ea59440ca5b4c23775a'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'de356482e9794bf19616b3e7eaee0a8c'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'df057f18639a4c178859e1653666b75b'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e4dd4d0821c2420fa19afcae10e0a5e3'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'e4df7205a80f43c7b5cd5834f67f373f'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'comment'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e624a3414dc043c3b454c63f17555dfd'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e6ba4ba4300f445e95f6e37f7f5ddf7f'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e9874228a5c54de2b806462ea6a09a09'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ec29bdb3b52b41b09bbe7ede1c17c1f1'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'edb2f1ac285540b48664891e72d181ab'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'edd6f42a7c0546b2bdeeb56a6881cb53'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ef600d4f0327409fbb3ca4fe62cca02f'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'f4c7a63d79884c049c48098e0103d41d'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'fe815e3d62d240cdb1812d233078511a'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                ]
            }
        }
    }
}
