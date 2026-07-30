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
                        id: 'bf7895f974e74775bd26583802d377d6'
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
                        id: 'b2ca6fb32e6b42ad9796aa43257c89ab'
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
                        id: '004a0b2fa3b84ccd94f9cea843d5425e'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '03fc354e98f248ffac8cba471e054d66'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'parent'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '04b43de2185d426da2e4718b218aac23'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '04db8acacfd74b7ba35740c19462c238'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '0625f0c8abae40e38eb7dd9cde067f1d'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '131b621c8471418d9775e7ab8c30e2ed'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '138d422d913546f9a16fec67398e551c'
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
                        id: '15a835a7aa5e4553bcccf83854af41c1'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '1691860b75e246d18b524c6e2983efd6'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'reference_section'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '1a40e07f4c9d403392f48e67290f1c3e'
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
                        id: '1b19fe4364b343c882b0bfc9e2c2b97e'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'methodology'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '1cc30cb08488406ab47aae5e0fb31b3d'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '20899c95718e438b9fb3bb67416969a9'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '219e7724f55440178867f1e9f7af3983'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '23588a122e9740dbb67871ca8c313aff'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '25658ba1b98441c7b0d7493f800be917'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '25dad733e52b4563917731c206fa759d'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'sys_choice_set'
                        id: '265d67e96f8046bb9cf444a7c5fb3a22'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '26d6c354f5fd43e4a5d43d17f9d6065d'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '26e653a25c3741cb8fea3e440b2e7448'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'job_aid_role'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '29cefc07bdbc4b75802c860c8d6d4c56'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'job_aid'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '2bc713867b8844d9879ffc1a9c3aad2c'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '2e4227fc9d6a4a30be4c9bf4fcd261d4'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '3070f9108ad44c30b64114cac72a3594'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'name'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '317714233a3545f687770904c859bbdf'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'content'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '318b433b36974a538a7bc7b476ea52f8'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'order'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '3237f130e4b74073837ebe3f48fe9d8a'
                        key: {
                            name: 'x_dlvry_method_content'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '3962d9b3c5024e6484851473bd92c9fa'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '39f4dc679316499fa74a07b0adaae242'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'deliverable'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '3a3bc64ee5f541a1830fa6239c95f714'
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
                        id: '3ccbecf22bae40d2b13e07a79627795e'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '40e10973a7724c3b8b1d1b2178e1ef7e'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '40ee1d3e38af404d96e84f6f4d4cb0a0'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '41dec9e8d2f04927ba49fbdd629dccba'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '42ec11c9ef97481390cfc15e10b25c99'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '43de67f7cf2e4f98b44ea92c9353be4b'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '4634e423db6e49ae81f9c9f5633210d9'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '48d73389e6304688a608da93bb828564'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'level_of_effort'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '48f7cbef7bb94fb29e1d6cc670c693ff'
                        key: {
                            name: 'x_dlvry_method_content'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '49e596c0021745a895ff3fa655087a7b'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '4a0cc710e27d40a9a3397c903bf4a49d'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '541dd9477efd4ad28caf97e4f5ca0683'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '56955df5185b4f7db0f9c03ad5ffd206'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'parent'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '582140c8c13944b4b3a4abf5e6c71891'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '58b33b5f05b9475d8b79bd0974f37008'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '59470719d8624d588b0af2a14de4bce4'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5c0cfeca6ef647c6bdec5b514c54df2b'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '5ce02b9d50fe42c9aa169d62363fc027'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '5d4781057e5543469803b421e6a91207'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '5e33ebc11c194978b1fa32207d552bd3'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '625f4f836ec74b159f6c7a7195257cba'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '62939832639d4e16901ff9bdcde9a3b5'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '674b24e378aa4aac84fdde43eab22463'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '68f92cbf41454b849bb1ac3b684966d3'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '69dd88c9586e45d8a46ff3143c392bab'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '6b48d7ab28d441a6bbaa03abe2a609bd'
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
                        id: '6bfa16e875d84cd0bf2838b91f4751c2'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '6c7af10658a74178988eb6e912f80363'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '6f9dc0942b074d89b048da23843bbd6d'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '719a3fbe1b9949148e8d0dba4c96e7d0'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'participant'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '71ec4f33bb07442b9342b44804ed3e32'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '72e1737ce9334aa883a4d5031d511d61'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'order'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '74ad5a9257c548ba97ffc49856ee90e1'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '753d70c0d5b641ed8b06484ac57b9a0f'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '780bddcf028f4aea998de69d6f2684eb'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '785b73dd3db1484bbea436610cce4d8f'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '7ee35afabc1c4eaa8b0dc73309384f94'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '7f1f1a3e4a144d5a9584cee99fdbe6e9'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '80b3bd247c0e4c5297681ade6f07fdad'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '84561434be344ff0885a82c48395fdf0'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '851abaa888f54e989a1966bffdc256f6'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '8884c8feab6e4e5b98e61cb203d42985'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '8a5a7da5d1c14400bdeb3550f83bd0fb'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8efa70012efa70013efa700'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '8efe2ceab0734c0aafbd5821977cebce'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '9170e0c8b78e4ea6ad9a4692b7f7367e'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            value: 'glossary_term'
                            language: 'en'
                            dependent_value: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '94268a44c5024d008f7c076a67728e7e'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '94b15a5f10ff4eb28788cfcef586e220'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '94fef589f3d548af8dcc4ef9c4759878'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '99377e8adc2e43b88f731e764efbbffb'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: '9b2679badaf24e2aa4ff790ab70332e8'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: '9d8830b778534b248eaa6ac682e7be8d'
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
                        id: 'a05c1293475549888968359a42dfd06f'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a0861272d34a4ccab65019b311a4ffca'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a0d6f11bf8c944449e418043d203f11c'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a2b838842180488badd274f3b0b4d19a'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'a2fac78d09c3410d9b674fd3cfc08961'
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
                        id: 'a3598d8c52044331878422abb68706bf'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a39afbc9f3dc4c64a8a8062c58b02b42'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a4016edd8dfb47e7b7a835981405e885'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a481121df8be45bcbb1ff00b1fbf540a'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8cfdfbc40cfdfbc41cfdfbc'
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
                        id: 'a5f7197742b94fa8b10cef1dd4a1974a'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'a9fe121ff49f4387bb0ce08fdd4985d0'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'af2f6a8cefb743bd93eca182d82be7f4'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'af7c849f24a94dd78cf65e9d785a29c2'
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
                        id: 'b450c33e0728487e929f7e2fdd1ae724'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8108a2fe7108a2fe8108a2f'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'b6760056e32642cfac8b69bc8e3aee66'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'b6ce45688c9d4815be019477dfb680ca'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8084b3e27084b3e28084b3e'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'b76bd1e6dcb441e7820a1e0be4227e55'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'b804b5e0cf284ad98522b24e79dde8ad'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'b818802efac14490921d7b59f41a3005'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'content'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ba881a67a7e84bafabfb7101e2bb604c'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8f7371912f7371913f73719'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'baa04a8e07224bd3a93ad2be3a15d14a'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'bcbdc37d9b43439b9fffbdf2f86b18c2'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c0c0d840c89e45c7837ff16e25bc93c6'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e83d4fdd023d4fdd033d4fdd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c3d5651ab2744660a05d43cc1d50a307'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c5edfae123404bee89431bb56f392805'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e83cdfcde83cdfcde93cdfcd'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c673fa511123432998e69b84e3f70dca'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'c8c17a4b22c6477bb922b0afc09ea8c9'
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
                        id: 'c8d60e98f6a74f0ab48563aa42ebbb1d'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'c9a3788e9dce4007869669312def914e'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'c9de9c81172d49a8b529ce6f48fb4fbf'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd1f36ce308124105b235d56cab6ea592'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd301c0d1488941bb92b23cd49540678c'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'd89aa9ba395944b58650ad20f3357a59'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e89b846a4a9b846a4b9b846a'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'd9e526fcb2504038a66c56fd8bc98de9'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'type'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'dd756ea093714e78bd3c38350fd61bc0'
                        key: {
                            name: 'x_dlvry_method_content'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'df211540dccd42489db5449e348642b7'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e079fdfa343c4115b2757f3a11be665a'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8c274e8d7c274e8d8c274e8'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e0aa6861e2774aa496592b1bc1d7c036'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e87b8295c07b8295c17b8295'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e0dafeb7e3cb43fb91d716e63ed1e8cb'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8e4182670e4182671e41826'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'e7380519794748bf8947d2f83e7891a2'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8f8019b7bf8019b7cf8019b'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'eb924ede4bac41d0abf2c3d75b12b451'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ee12b75f8a364292a1ebea7c6ddf67b7'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'ef0db61f7b59432baf134a4d8af3debb'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e88562b3848562b3858562b3'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'f01c25afa2df4dff9e67cab3b3decb8c'
                        key: {
                            sp_widget: 'a4b5c6d7e8a41c6a1ea41c6a1fa41c6a'
                            sp_angular_provider: 'a4b5c6d7e8498b43c3498b43c4498b43'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'f3e8e5e835f048cdb74649230e15c679'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8b8715401b8715402b87154'
                        }
                    },
                    {
                        table: 'sys_choice'
                        id: 'f4c3976698e740a98f731b7dcdccad1c'
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
                        id: 'f5e08e2aa000414ebbbcb91f054b385e'
                        key: {
                            sp_widget: 'a4b5c6d7e8742d3f26742d3f27742d3f'
                            sp_angular_provider: 'a4b5c6d7e8304eff10304eff11304eff'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'f5eb6b7f4b974628884ce61c56f68720'
                        key: {
                            sp_widget: 'a4b5c6d7e8bddb48e2bddb48e3bddb48'
                            sp_angular_provider: 'a4b5c6d7e8a6d8b29aa6d8b29ba6d8b2'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'f7395d4fa87f40a1a486f484c73c4a90'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e823fc597523fc597623fc59'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'f93d51ab870a4d2c97a3ea071590064b'
                        key: {
                            sp_widget: 'a4b5c6d7e85271166b5271166c527116'
                            sp_angular_provider: 'a4b5c6d7e8ba87332eba87332fba8733'
                        }
                    },
                    {
                        table: 'm2m_sp_ng_pro_sp_widget'
                        id: 'fbaeaec26ee64a33983c2e7815a35ed4'
                        key: {
                            sp_widget: 'a4b5c6d7e8c3931246c3931247c39312'
                            sp_angular_provider: 'a4b5c6d7e8d1f419dad1f419dbd1f419'
                        }
                    },
                ]
            }
        }
    }
}
