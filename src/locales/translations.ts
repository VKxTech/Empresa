export const translations = {
  pt: {
    nav: {
      company: 'A Empresa',
      wallet: 'VKX Wallet',
      portfolio: 'Portfólio',
      services: 'Soluções',
      contact: 'Contato',
      request: 'Solicitar Proposta'
    },
    hero: {
      tagline: 'Desenvolvimento Mobile e Sistemas Integrados',
      title_start: 'Engenharia de software',
      title_end: 'sob medida',
      description: 'Soluções tecnológicas focadas em eficiência operacional, segurança de dados e escalabilidade para o ambiente corporativo.',
      btn_request: 'Solicitar Consultoria',
      btn_solutions: 'Soluções Técnicas',
      fiscal_note: 'Prestamos serviços com emissão de Nota Fiscal.'
    },
    approach: {
      title: 'Nossa abordagem técnica',
      description: 'Cada projeto é tratado como um ativo crítico de negócio. Priorizamos a robustez da arquitetura para garantir a continuidade operacional.',
      items: [
        { title: 'Arquitetura Escalável', desc: 'Sistemas preparados para o crescimento de demanda sem perda de performance.' },
        { title: 'Observabilidade', desc: 'Monitoramento constante e logs detalhados para antecipação de falhas.' },
        { title: 'Manutenibilidade', desc: 'Código limpo e documentado para facilitar a evolução futura do produto.' }
      ],
      security_title: 'Segurança e Governança',
      security_desc: 'Adotamos boas práticas de segurança da informação, com criptografia, controle de acesso e conformidade com a LGPD em todos os fluxos de dados.',
      security_items: [
        'Ambientes de desenvolvimento segregados',
        'Backup e recuperação de desastres',
        'Validação de integridade de dados'
      ]
    },
    method: {
      title: 'Como Trabalhamos',
      steps: [
        { title: 'Diagnóstico', desc: 'Entendimento profundo dos desafios do negócio.' },
        { title: 'Proposta', desc: 'Definição técnica e comercial detalhada.' },
        { title: 'Arquitetura', desc: 'Planejamento da estrutura e fluxos de dados.' },
        { title: 'Execução', desc: 'Desenvolvimento com validações por etapa.' },
        { title: 'Evolução', desc: 'Suporte contínuo e manutenção evolutiva.' }
      ]
    },
    wallet: {
      tag: 'Software Não-Custodial & Multichain',
      title: 'VKX Wallet',
      description: 'Uma carteira mobile-first projetada para gestão autônoma de ativos. Gerencie endereços na BNB Chain, Base e Solana com arquitetura de segurança auditável.',
      btn_appstore: 'App Store (Em Breve)',
      btn_googleplay: 'Google Play',
      features: [
        { title: 'Non-Custodial', desc: 'Você detém controle total de suas chaves privadas. A VKX Technologies nunca tem acesso aos seus ativos.' },
        { title: 'Multichain', desc: 'Compatibilidade nativa com <strong>BNB Chain, Base e Solana</strong>. Gerencie diversos portfólios em uma única interface.' },
        { title: 'Segurança', desc: 'Criptografia local avançada e auditoria contínua de contratos. Projetada para resistir a vetores de ataque comuns.' }
      ],
      roadmap: {
        title: 'Protocol Roadmap',
        q1: {
          title: 'Q1 2026: Core Infrastructure & Beta Release',
          subsections: [
            {
              title: 'Mobile Client (v1.0.0-beta)',
              items: [
                'Gerador de chaves não-custodial (BIP-39/BIP-44) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmado</span>',
                'Integração de nós RPC para BNB Chain, Base e Solana <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmado</span>',
                'Assinatura de transações offline (offline signing) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmado</span>'
              ]
            },
            {
              title: 'DEX Aggregation Layer',
              items: [
                'Roteamento inteligente via Jupiter API (Solana) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmado</span>',
                'Agregação via 0x API / Routers nativos (EVM) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[9px] font-bold uppercase tracking-wider">Parcial</span>',
                'Proteção contra Slippage excessivo (slippageBps) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmado</span>'
              ]
            }
          ],
          status: 'Validação Final Concluída'
        },
        q2: {
          title: 'Q2 2026: Security & Hardware Integration',
          subsections: [
            {
              title: 'Cold Storage Support',
              items: [
                'Integração via Bluetooth/USB com Ledger Nano X e Trezor Safe 3',
                'Protocolo WalletConnect v2.0 para dApps externos <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">Em Teste Beta</span>'
              ]
            },
            {
              title: 'Solana Native Staking',
              items: [
                'Delegação direta de stake via interface da wallet (non-custodial)',
                'Visualização de validadores e métricas de uptime on-chain'
              ]
            }
          ]
        },
        q3: {
          title: 'Q3 2026: Developer SDK & L2 Expansion',
          subsections: [
            {
              title: 'VKX Connect SDK',
              items: [
                'Biblioteca JavaScript/TypeScript para dApps integrarem a VKX Wallet',
                'Documentação técnica pública e exemplos de implementação'
              ]
            },
            {
              title: 'EVM L2 Scaling',
              items: [
                'Suporte nativo Arbitrum One <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">Em Teste Beta</span>',
                'Suporte nativo Optimism (bridging e transações)',
                'Otimização de gas estimation para L2s'
              ]
            }
          ]
        }
      },
      disclaimer: {
        title: 'Informações Importantes',
        p1: 'Natureza do Produto: A VKX Wallet é um software de interface (carteira não custodial). A VKX Technologies não custodia e não tem acesso aos ativos.',
        p2: 'Independência do Token: O funcionamento da wallet é independente de qualquer token. O uso não requer posse de ativos específicos.',
        p3: 'Execução On-Chain: Todas as transações são executadas diretamente na blockchain sob comando exclusivo do usuário. A VKX Technologies não valida nem reverte operações.'
      },
      traction: {
        title: 'Tração & Projeção de Crescimento',
        subtitle: 'Métricas de atividade da versão Alpha. As projeções representam estimativas de capacidade de infraestrutura e não garantem adoção futura.',
        legend_active: 'Usuários Ativos (Alpha)',
        legend_projected: 'Projeção (12 Meses)'
      },
      company: {
        title: 'Institucional',
        subtitle: 'VKX Technologies',
        about_title: 'Quem Somos',
        about_text: 'A VKX Technologies é uma consultoria de tecnologia e desenvolvimento de software especializada em arquiteturas de alto desempenho e sistemas de missão crítica. Fundada em 2019, nossa organização foca na entrega de soluções proprietárias que garantem autonomia técnica e segurança operacional para nossos parceiros corporativos.',
        mission_title: 'Missão',
        mission_text: 'Prover infraestrutura digital de excelência, transformando desafios operacionais em ativos tecnológicos mensuráveis e seguros.',
        method_title: 'Forma de Atuação',
        method_text: 'Baseamos nossa metodologia em transparência, rigor técnico e validações constantes por etapas contratuais definidas.',
        experience_title: 'Experiência Operacional',
        experience_text_1: 'Nossa atuação inclui experiência prática em operações de suporte técnico em campo, lidando com ambientes corporativos, equipamentos de infraestrutura e fluxos de chamados estruturados via ITSM.',
        experience_text_2: 'Estamos familiarizados com os padrões de atendimento exigidos por empresas de médio e grande porte, garantindo conformidade com SLAs rigorosos e integração eficiente a times de TI internos por meio de parcerias e contratos operacionais indiretos.',
        profile_title: 'Perfil de Atendimento',
        profile_desc: 'Atendemos preferencialmente empresas que demandam integração de dados, automação de processos complexos e segurança da informação como prioridade máxima.',
        guidelines: 'Diretrizes de Engajamento:',
        segments: 'Segmentos: Indústria e Comércio, Logística, Finanças, Saúde e Educação Corporativa.',
        focus: 'Foco: Sistemas de Gestão (ERP/CRM), Aplicativos Customizados, Integrações de APIs e Camadas de Segurança.',
        restriction: 'Não atendemos solicitações de projetos recreativos, sem modelo de negócio definido ou que não exijam rigor de engenharia.',
        governance_title: 'Governança e Segurança',
        governance_text: 'Operamos sob rígidas diretrizes de Segurança da Informação. Todos os dados são tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD). Utilizamos ambientes segregados para desenvolvimento e produção, com controle de acesso granular e criptografia em repouso e em trânsito.',
        governance_note: 'Nota: Todas as garantias de conformidade e suporte são regidas por instrumento contratual específico.'
      },
      services: {
        title: 'Soluções de',
        title_gradient: 'Alta Performance',
        subtitle: 'Desenvolvimento técnico especializado para demandas complexas de infraestrutura digital e automação corporativa.',
        app_title: 'Engenharia de Apps',
        app_desc: 'Desenvolvimento de aplicações mobile escaláveis focadas em processos de negócio e experiência do usuário final, com integração nativa de hardware e APIs.',
        app_items: ['Aplicações Multiplataforma', 'Integração de Gateway de Pagamento', 'Sincronização de Dados em Tempo Real'],
        erp_title: 'Sistemas de Gestão',
        erp_desc: 'Arquitetura de sistemas internos (CRM/ERP) sob medida para controle total de fluxo de trabalho, gestão de leads e automação operacional.',
        erp_items: ['Dashboards de BI Customizados', 'Automação de Backoffice', 'Segurança de Dados Corporativos'],
        infra_title: 'Infraestrutura & APIs',
        infra_desc: 'Construção de ecossistemas robustos de microsserviços e APIs de alta disponibilidade para interconectividade entre sistemas legados e novos produtos.',
        infra_items: ['Webhooks e Middlewares', 'Escalabilidade via Microsserviços', 'Observabilidade e Logística de Dados'],
        support_title: 'Suporte & Operações B2B',
        support_desc: 'Atuamos em operações de suporte técnico e manutenção de sistemas em ambientes corporativos, integrando atendimento remoto e em campo com rigoroso controle de SLA.',
        support_items: ['Atuação em Ambientes Críticos', 'Fluxos de Chamados (ITSM)', 'Gestão de SLA e Prazos'],
        fiscal_text_1: 'Todos os serviços prestados pela',
        fiscal_company: 'VKX Technologies',
        fiscal_text_2: 'são formalizados, com contrato e emissão de',
        fiscal_note: 'Nota Fiscal',
        fiscal_text_3: ', conforme a legislação vigente e os mais altos padrões de transparência corporativa.'
      },
      contact: {
        title: 'Canais de Atendimento',
        title_gradient: 'Corporativo',
        subtitle: 'Nossa equipe técnica e comercial está à disposição para analisar suas demandas de software e infraestrutura digital.',
        whatsapp_label: 'WhatsApp Corporativo',
        whatsapp_value: '+55 89 99930-7197',
        email_label: 'E-mail Corporativo',
        email_value: 'contato@vkxtech.com.br',
        form_title: 'Solicitação de Contato',
        placeholder_name: 'Nome Completo',
        placeholder_email: 'E-mail Institucional',
        placeholder_message: 'Descreva brevemente a demanda ou necessidade técnica...',
        btn_submit: 'Enviar Solicitação'
      }
    },
    footer: {
      desc: 'Consultoria técnica especializada em engenharia de software de alta performance, segurança de dados e infraestrutura Web3.',
      rights: 'Todos os direitos reservados.',
      institutional: 'Institucional',
      governance: 'Governança'
    }
  },
  en: {
    nav: {
      company: 'Company',
      wallet: 'VKX Wallet',
      portfolio: 'Portfolio',
      services: 'Solutions',
      contact: 'Contact',
      request: 'Request Proposal'
    },
    hero: {
      tagline: 'Mobile Development & Integrated Systems',
      title_start: 'Software Engineering',
      title_end: 'Tailor-made',
      description: 'Technological solutions focused on operational efficiency, data security and scalability for the corporate environment.',
      btn_request: 'Request Consultancy',
      btn_solutions: 'Technical Solutions',
      fiscal_note: 'We provide services with formal invoicing.'
    },
    approach: {
      title: 'Our Technical Approach',
      description: 'Each project is treated as a critical business asset. We prioritize architectural robustness to ensure operational continuity.',
      items: [
        { title: 'Scalable Architecture', desc: 'Systems prepared for demand growth without performance loss.' },
        { title: 'Observability', desc: 'Constant monitoring and detailed logs for failure anticipation.' },
        { title: 'Maintainability', desc: 'Clean and documented code to facilitate future product evolution.' }
      ],
      security_title: 'Security & Governance',
      security_desc: 'We adopt information security best practices, with encryption, access control, and GDPR compliance in all data flows.',
      security_items: [
        'Segregated development environments',
        'Backup and disaster recovery',
        'Data integrity validation'
      ]
    },
    method: {
      title: 'How We Work',
      steps: [
        { title: 'Diagnosis', desc: 'Deep understanding of business challenges.' },
        { title: 'Proposal', desc: 'Detailed technical and commercial definition.' },
        { title: 'Architecture', desc: 'Structure and data flow planning.' },
        { title: 'Execution', desc: 'Development with stage-by-stage validation.' },
        { title: 'Evolution', desc: 'Continuous support and evolutionary maintenance.' }
      ]
    },
    wallet: {
      tag: 'Non-Custodial & Multichain Software',
      title: 'VKX Wallet',
      description: 'A mobile-first wallet designed for autonomous asset management. Manage addresses on BNB Chain, Base, and Solana with auditable security architecture.',
      btn_appstore: 'App Store (Coming Soon)',
      btn_googleplay: 'Google Play',
      features: [
        { title: 'Non-Custodial', desc: 'You hold full control of your private keys. VKX Technologies never accesses your assets.' },
        { title: 'Multichain', desc: 'Native compatibility with <strong>BNB Chain, Base, and Solana</strong>. Manage diverse portfolios in a single interface.' },
        { title: 'Security', desc: 'Advanced local encryption and continuous contract audits. Designed to resist common attack vectors.' }
      ],
      roadmap: {
        title: 'Protocol Roadmap',
        q1: {
          title: 'Q1 2026: Core Infrastructure & Beta Release',
          subsections: [
            {
              title: 'Mobile Client (v1.0.0-beta)',
              items: [
                'Non-custodial key generator (BIP-39/BIP-44) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmed</span>',
                'RPC node integration for BNB Chain, Base and Solana <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmed</span>',
                'Offline transaction signing <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmed</span>'
              ]
            },
            {
              title: 'DEX Aggregation Layer',
              items: [
                'Smart routing via Jupiter API (Solana) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmed</span>',
                'Aggregation via 0x API / Native Routers (EVM) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[9px] font-bold uppercase tracking-wider">Partial</span>',
                'Excessive Slippage protection (slippageBps) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">Confirmed</span>'
              ]
            }
          ],
          status: 'Final Validation Complete'
        },
        q2: {
          title: 'Q2 2026: Security & Hardware Integration',
          subsections: [
            {
              title: 'Cold Storage Support',
              items: [
                'Bluetooth/USB integration with Ledger Nano X and Trezor Safe 3',
                'WalletConnect v2.0 protocol for external dApps <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">Beta Testing</span>'
              ]
            },
            {
              title: 'Solana Native Staking',
              items: [
                'Direct stake delegation via wallet interface (non-custodial)',
                'Validators visualization and on-chain uptime metrics'
              ]
            }
          ]
        },
        q3: {
          title: 'Q3 2026: Developer SDK & L2 Expansion',
          subsections: [
            {
              title: 'VKX Connect SDK',
              items: [
                'JavaScript/TypeScript library for dApps to integrate VKX Wallet',
                'Public technical documentation and implementation examples'
              ]
            },
            {
              title: 'EVM L2 Scaling',
              items: [
                'Arbitrum One native support <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">Beta Testing</span>',
                'Optimism native support (bridging and transactions)',
                'Gas estimation optimization for L2s'
              ]
            }
          ]
        }
      },
      disclaimer: {
        title: 'Important Information',
        p1: 'Product Nature: VKX Wallet is interface software (non-custodial wallet). VKX Technologies does not custody or access user assets.',
        p2: 'Token Independence: Wallet operation is independent of any token. Usage does not require specific asset holdings.',
        p3: 'On-Chain Execution: All transactions are executed directly on the blockchain under exclusive user command. VKX Technologies does not validate or revert operations.'
      },
      traction: {
        title: 'Traction & Growth Projection',
        subtitle: 'Alpha version activity metrics. Projections represent infrastructure capacity estimates and do not guarantee future adoption.',
        legend_active: 'Active Users (Alpha)',
        legend_projected: 'Projection (12 Months)'
      },
      company: {
        title: 'Institutional',
        subtitle: 'VKX Technologies',
        about_title: 'Who We Are',
        about_text: 'VKX Technologies is a technology consultancy and software development firm specializing in high-performance architectures and mission-critical systems. Founded in 2019, our organization focuses on delivering proprietary solutions that ensure technical autonomy and operational security for our corporate partners.',
        mission_title: 'Mission',
        mission_text: 'To provide excellent digital infrastructure, transforming operational challenges into measurable and secure technological assets.',
        method_title: 'Our Method',
        method_text: 'We base our methodology on transparency, technical rigor, and constant validations through defined contractual stages.',
        experience_title: 'Operational Experience',
        experience_text_1: 'Our activities include practical experience in field technical support, dealing with corporate environments, infrastructure equipment, and structured ticket flows via ITSM.',
        experience_text_2: 'We are familiar with service standards required by medium and large enterprises, ensuring compliance with rigorous SLAs and efficient integration with internal IT teams through partnerships and indirect operational contracts.',
        profile_title: 'Service Profile',
        profile_desc: 'We preferentially serve companies that demand data integration, complex process automation, and information security as a maximum priority.',
        guidelines: 'Engagement Guidelines:',
        segments: 'Segments: Industry and Commerce, Logistics, Finance, Health, and Corporate Education.',
        focus: 'Focus: Management Systems (ERP/CRM), Custom Apps, API Integrations, and Security Layers.',
        restriction: 'We do not service requests for recreational projects, those without a defined business model, or those not requiring engineering rigor.',
        governance_title: 'Governance & Security',
        governance_text: 'We operate under strict Information Security guidelines. All data is treated in compliance with the General Data Protection Law (LGPD). We use segregated environments for development and production, with granular access control and encryption at rest and in transit.',
        governance_note: 'Note: All compliance and support guarantees are governed by specific contractual instruments.'
      },
      services: {
        title: 'Solutions for',
        title_gradient: 'High Performance',
        subtitle: 'Specialized technical development for complex digital infrastructure and corporate automation demands.',
        app_title: 'App Engineering',
        app_desc: 'Scalable mobile application development focused on business processes and end-user experience, with native hardware and API integration.',
        app_items: ['Cross-platform Applications', 'Payment Gateway Integration', 'Real-time Data Synchronization'],
        erp_title: 'Management Systems',
        erp_desc: 'Tailor-made internal system architecture (CRM/ERP) for total workflow control, lead management, and operational automation.',
        erp_items: ['Custom BI Dashboards', 'Backoffice Automation', 'Corporate Data Security'],
        infra_title: 'Infrastructure & APIs',
        infra_desc: 'Building robust microservices ecosystems and high-availability APIs for interconnectivity between legacy systems and new products.',
        infra_items: ['Webhooks and Middlewares', 'Microservices Scalability', 'Observability and Data Logistics'],
        support_title: 'Support & B2B Operations',
        support_desc: 'We operate in technical support and system maintenance in corporate environments, integrating remote and field service with rigorous SLA control.',
        support_items: ['Critical Environment Operations', 'Ticket Flows (ITSM)', 'SLA and Deadline Management'],
        fiscal_text_1: 'All services provided by',
        fiscal_company: 'VKX Technologies',
        fiscal_text_2: 'are formalized, with contracts and issuance of',
        fiscal_note: 'Legal Invoices',
        fiscal_text_3: ', in accordance with current legislation and the highest standards of corporate transparency.'
      },
      contact: {
        title: 'Service Channels',
        title_gradient: 'Corporate',
        subtitle: 'Our technical and commercial team is available to analyze your software and digital infrastructure demands.',
        whatsapp_label: 'Corporate WhatsApp',
        whatsapp_value: '+55 89 99930-7197',
        email_label: 'Corporate Email',
        email_value: 'contato@vkxtech.com.br',
        form_title: 'Contact Request',
        placeholder_name: 'Full Name',
        placeholder_email: 'Institutional Email',
        placeholder_message: 'Briefly describe your demand or technical need...',
        btn_submit: 'Send Request'
      }
    },
    footer: {
      desc: 'Technical consultancy specialized in high-performance software engineering, data security, and Web3 infrastructure.',
      rights: 'All rights reserved.',
      institutional: 'Institutional',
      governance: 'Governance'
    }
  },
  zh: {
    nav: {
      company: '公司',
      wallet: 'VKX 钱包',
      portfolio: '投资组合',
      services: '解决方案',
      contact: '联系方式',
      request: '请求建议'
    },
    hero: {
      tagline: '移动开发与集成系统',
      title_start: '软件工程',
      title_end: '量身定制',
      description: '专注于企业环境的运营效率、数据安全和可扩展性的技术解决方案。',
      btn_request: '请求咨询',
      btn_solutions: '技术解决方案',
      fiscal_note: '我们提供带有正式发票的服务。'
    },
    approach: {
      title: '我们的技术方针',
      description: '每个项目都被视为关键业务资产。我们优先考虑架构的稳健性以确保持续运营。',
      items: [
        { title: '可扩展架构', desc: '为需求增长做好准备的系统，无性能损失。' },
        { title: '可观测性', desc: '持续监控和详细日志以预测故障。' },
        { title: '可维护性', desc: '干净且有文档的代码，以促进未来的产品演进。' }
      ],
      security_title: '安全与治理',
      security_desc: '我们在所有数据流中采用信息安全最佳实践，包括加密、访问控制和 GDPR 合规性。',
      security_items: [
        '隔离的开发环境',
        '备份和灾难恢复',
        '数据完整性验证'
      ]
    },
    method: {
      title: '工作方式',
      steps: [
        { title: '诊断', desc: '深入理解业务挑战。' },
        { title: '提案', desc: '详细的技术和商业定义。' },
        { title: '架构', desc: '结构和数据流规划。' },
        { title: '执行', desc: '分阶段验证的开发。' },
        { title: '演进', desc: '持续支持和演进维护。' }
      ]
    },
    wallet: {
      tag: '非托管和多链软件',
      title: 'VKX 钱包',
      description: '专为自主资产管理设计的移动优先钱包。在 BNB Chain、Base 和 Solana 上管理地址，具有可审计的安全架构。',
      btn_appstore: 'App Store (即将推出)',
      btn_googleplay: 'Google Play',
      features: [
        { title: '非托管', desc: '您完全控制您的私钥。VKX Technologies 从不访问您的资产。' },
        { title: '多链', desc: '与 <strong>BNB Chain、Base 和 Solana</strong> 原生兼容。在单一界面管理多样化的投资组合。' },
        { title: '安全', desc: '先进的本地加密和持续的合约审计。旨在抵御常见攻击向量。' }
      ],
      roadmap: {
        title: 'Protocol Roadmap',
        q1: {
          title: 'Q1 2026: 核心基础设施 & Beta',
          subsections: [
            {
              title: '移动客户端 (v1.0.0-beta)',
              items: [
                '非托管密钥生成器 (BIP-39/BIP-44) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">已确认</span>',
                'BNB Chain, Base 和 Solana 的 RPC 节点集成 <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">已确认</span>',
                '离线交易签名 <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">已确认</span>'
              ]
            },
            {
              title: 'DEX 聚合层',
              items: [
                '通过 Jupiter API 智能路由 (Solana) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">已确认</span>',
                '通过 0x API / 原生路由器聚合 (EVM) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[9px] font-bold uppercase tracking-wider">部分</span>',
                '过度滑点保护 (slippageBps) <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-bold uppercase tracking-wider">已确认</span>'
              ]
            }
          ],
          status: '最终验证完成'
        },
        q2: {
          title: 'Q2 2026: 安全 & 硬件',
          subsections: [
            {
              title: '冷存储支持',
              items: [
                '通过蓝牙/USB 与 Ledger Nano X 和 Trezor Safe 3 集成',
                '用于外部 dApps 的 WalletConnect v2.0 协议 <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">Beta 测试中</span>'
              ]
            },
            {
              title: 'Solana 原生质押',
              items: [
                '通过钱包界面直接进行权益委托 (非托管)',
                '验证者可视化和链上正常运行时间指标'
              ]
            }
          ]
        },
        q3: {
          title: 'Q3 2026: SDK & L2 扩展',
          subsections: [
            {
              title: 'VKX Connect SDK',
              items: [
                '用于 dApps 集成 VKX 钱包的 JavaScript/TypeScript 库',
                '公共技术文档和实现示例'
              ]
            },
            {
              title: 'EVM L2 扩展',
              items: [
                'Arbitrum One 原生支持 <span class="ml-2 inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">Beta 测试中</span>',
                'Optimism 原生支持 (桥接和交易)',
                '针对 L2 的 gas 估算优化'
              ]
            }
          ]
        }
      },
      disclaimer: {
        title: '重要信息',
        p1: '产品性质：VKX 钱包是界面软件（非托管钱包）。VKX Technologies 不托管也不访问用户资产。',
        p2: '代币独立性：钱包操作独立于任何代币。使用不需要持有特定资产。',
        p3: '链上执行：所有交易均在用户的独家指挥下直接在区块链上执行。VKX Technologies 不验证也不撤销操作。'
      },
      traction: {
        title: '牵引力与增长预测',
        subtitle: 'Alpha 版本活动指标。预测代表基础设施容量估计，并不保证未来的采用。',
        legend_active: '活跃用户 (Alpha)',
        legend_projected: '预测 (12 个月)'
      },
      company: {
        title: '机构',
        subtitle: 'VKX Technologies',
        about_title: '我们是谁',
        about_text: 'VKX Technologies 是一家技术咨询和软件開發公司，专注于高性能架构和关键任务系统。成立于 2019 年，我们的组织专注于提供专有解决方案，为我们的企业合作伙伴确保持术自主权和运营安全。',
        mission_title: '使命',
        mission_text: '提供卓越的数字基础设施，将运营挑战转化为可衡量且安全的技术资产。',
        method_title: '行动方式',
        method_text: '我们的方法基于透明度、技术严谨性和通过定义的合同阶段进行的持续验证。',
        experience_title: '运营经验',
        experience_text_1: '我们的活动包括现场技术支持运营的实践经验，处理企业环境、基础设施设备和通过 ITSM 结构化的工单流。',
        experience_text_2: '我们熟悉大中型企业要求的服务标准，确保符合严格的 SLA，并通过合作伙伴关系和间接运营合同与内部 IT 团队有效整合。',
        profile_title: '服务概况',
        profile_desc: '我们优先服务于需要数据集成、复杂流程自动化和信息安全作为最高优先级的公司。',
        guidelines: '参与准则：',
        segments: '细分市场：工业和商业、物流、金融、健康和企业教育。',
        focus: '重点：管理系统 (ERP/CRM)、定制应用程序、API 集成和安全层。',
        restriction: '我们不接受娱乐项目、没有定义商业模式或不需要工程严谨性的请求。',
        governance_title: '治理与安全',
        governance_text: '我们在严格的信息安全准则下运营。所有数据均按照一般数据保护法 (LGPD) 进行处理。我们使用隔离的开发和生产环境，具有细粒度的访问控制以及静态和传输中的加密。',
        governance_note: '注意：所有合规性和支持保证均受特定合同文书管辖。'
      },
      services: {
        title: '解决方案',
        title_gradient: '高性能',
        subtitle: '针对复杂数字基础设施和企业自动化需求的专业技术开发。',
        app_title: '应用工程',
        app_desc: '开发专注于业务流程和最终用户体验的可扩展移动应用程序，具有本地硬件和 API 集成。',
        app_items: ['跨平台应用程序', '支付网关集成', '实时数据同步'],
        erp_title: '管理系统',
        erp_desc: '量身定制的内部系统架构 (CRM/ERP)，用于全面工作流控制、潜在客户管理和运营自动化。',
        erp_items: ['定制 BI 仪表板', '后台自动化', '企业数据安全'],
        infra_title: '基础设施 & API',
        infra_desc: '构建强大的微服务生态系统和高可用性 API，用于遗留系统和新产品之间的互联互通。',
        infra_items: ['Webhooks 和中间件', '微服务可扩展性', '可观测性和数据物流'],
        support_title: '支持 & B2B 运营',
        support_desc: '我们在企业环境中从事技术支持和系统维护运营，整合远程和现场服务，并实行严格的 SLA 控制。',
        support_items: ['关键环境运营', '工单流 (ITSM)', 'SLA 和截止日期管理'],
        fiscal_text_1: '所有由',
        fiscal_company: 'VKX Technologies',
        fiscal_text_2: '提供的服务均已正规化，有合同并开具',
        fiscal_note: '法律发票',
        fiscal_text_3: '，符合现行法律和最高的企业透明度标准。'
      },
      contact: {
        title: '服务渠道',
        title_gradient: '企业',
        subtitle: '我们的技术和商务团队随时准备分析您的软件和数字基础设施需求。',
        whatsapp_label: '企业 WhatsApp',
        whatsapp_value: '+55 89 99930-7197',
        email_label: '企业邮箱',
        email_value: 'contato@vkxtech.com.br',
        form_title: '联系请求',
        placeholder_name: '全名',
        placeholder_email: '机构邮箱',
        placeholder_message: '简要描述您的需求或技术需要...',
        btn_submit: '发送请求'
      }
    },
    footer: {
      desc: '专注于高性能软件工程、数据安全和 Web3 基础设施的技术咨询。',
      rights: '版权所有。',
      institutional: '企业',
      governance: '治理'
    }
  }
};
