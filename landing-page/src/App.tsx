import './App.css'

function App() {
  return (
    <div className="page">
      <header className="header">
        <div className="container header-content">
          <div className="logo-area">
            <div className="logo-mark">CP</div>
            <div className="logo-text">
              <span className="logo-title">ClientePro</span>
              <span className="logo-subtitle">Gestão de limpeza e agenda</span>
            </div>
          </div>

          <nav className="nav">
            <a href="#pra-quem">Pra quem é</a>
            <a href="#problemas">Problemas</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#plano">Plano</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="header-cta">
            <button className="btn btn-ghost">Login</button>
            <button className="btn btn-primary">Começar Agora</button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="section hero">
          <div className="container hero-grid">
      <div>
              <div className="badge">Feito para empresas de limpeza</div>
              <h1>Seu parceiro confiável para organizar sua empresa de limpeza</h1>
              <p className="hero-subtitle">
                O ClientePro centraliza clientes, agenda e financeiro em uma plataforma simples,
                feita para quem vive de limpeza residencial ou comercial.
              </p>

              <div className="hero-actions">
                <button className="btn btn-primary btn-lg">Começar teste grátis de 30 dias</button>
                <button className="btn btn-outline btn-lg">Ver como o sistema funciona</button>
              </div>

              <p className="hero-small">Não precisa de cartão de crédito • Cancele quando quiser</p>
            </div>

            <div className="hero-card">
              <div className="hero-app-header">
                <div className="hero-app-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="hero-app-title">Dashboard ClientePro</span>
              </div>

              {/* Aqui você pode trocar depois por prints reais do ClientePro */}
              <div className="hero-app-body">
                <div className="hero-kpi-grid">
                  <div className="kpi-card">
                    <span className="kpi-label">Clientes ativos</span>
                    <strong className="kpi-value">128</strong>
                    <span className="kpi-tag kpi-tag-green">+12 este mês</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Receita prevista</span>
                    <strong className="kpi-value">R$ 18.740</strong>
                    <span className="kpi-tag kpi-tag-blue">Próximos 30 dias</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">Boletos pendentes</span>
                    <strong className="kpi-value">R$ 1.297</strong>
                    <span className="kpi-tag kpi-tag-orange">7 vencendo hoje</span>
                  </div>
                </div>

                <div className="hero-table">
                  <div className="hero-table-header">
                    <span>Cliente</span>
                    <span>Próximo agendamento</span>
                    <span>Status</span>
                    <span>Pagamento</span>
                  </div>
                  <div className="hero-table-row">
                    <span>Ana Souza</span>
                    <span>Hoje • 14:30</span>
                    <span className="pill pill-blue">AGENDADO</span>
                    <span className="pill pill-orange">PENDENTE</span>
                  </div>
                  <div className="hero-table-row">
                    <span>Lucas Lima</span>
                    <span>Hoje • 16:00</span>
                    <span className="pill pill-green">CONCLUÍDO</span>
                    <span className="pill pill-green">PAGO</span>
                  </div>
                  <div className="hero-table-row">
                    <span>Maria Alves</span>
                    <span>Amanhã • 09:00</span>
                    <span className="pill pill-blue">AGENDADO</span>
                    <span className="pill">—</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEMOS */}
        <section id="demos" className="section demos-section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Veja em ação</span>
              <h2>Dê play e veja como é usar o ClientePro no dia a dia</h2>
              <p>
                Pequenos loops mostram as principais telas: dashboard, agenda e financeiro. Troque
                pelos seus GIFs ou gravações reais quando quiser.
              </p>
            </div>

            <div className="demo-grid">
              <div className="demo-card">
                <div className="demo-player">
                  <div className="demo-screen demo-dashboard">
                    <div className="demo-window">
                      <div className="demo-toolbar">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="demo-kpis">
                        <div />
                        <div />
                        <div />
                      </div>
                      <div className="demo-list">
                        <div className="demo-list-row active" />
                        <div className="demo-list-row" />
                        <div className="demo-list-row" />
                        <div className="demo-list-row" />
                      </div>
                      <div className="demo-cursor" />
                    </div>
                  </div>
                </div>
                <div className="demo-info">
                  <h3>Dashboard ao vivo</h3>
                  <p>
                    KPIs de clientes ativos, receitas e pendências aparecem assim que você entra.
                    Dá para identificar onde precisa agir em segundos.
                  </p>
                </div>
              </div>

              <div className="demo-card">
                <div className="demo-player">
                  <div className="demo-screen demo-agenda">
                    <div className="demo-window">
                      <div className="demo-toolbar toolbar-dark">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="demo-calendar">
                        {Array.from({ length: 6 }).map((_, columnIndex) => (
                          <div key={columnIndex} className="demo-calendar-column">
                            {Array.from({ length: 4 }).map((__, rowIndex) => (
                              <div key={rowIndex} className="demo-calendar-slot" />
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="demo-cursor cursor-agenda" />
                    </div>
                  </div>
                </div>
                <div className="demo-info">
                  <h3>Agenda semanal inteligente</h3>
                  <p>
                    Arraste compromissos, filtre por status e veja rotas do dia. Ideal para saber
                    onde cada equipe precisa estar.
                  </p>
                </div>
              </div>

              <div className="demo-card">
                <div className="demo-player">
                  <div className="demo-screen demo-finance">
                    <div className="demo-window">
                      <div className="demo-toolbar">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="demo-chart">
                        <div className="demo-chart-bars">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="demo-chart-table">
                          <div className="demo-chart-row" />
                          <div className="demo-chart-row" />
                          <div className="demo-chart-row" />
                        </div>
                      </div>
                      <div className="demo-cursor cursor-finance" />
                    </div>
                  </div>
                </div>
                <div className="demo-info">
                  <h3>Financeiro e cobranças</h3>
                  <p>
                    Marque pagamentos como PAGO, gere faturas e acompanhe o caixa do mês. Adeus
                    planilha quebrada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRA QUEM É */}
        <section id="pra-quem" className="section section-alt">
          <div className="container narrow">
            <div className="section-header">
              <span className="section-badge">Pra quem é</span>
              <h2>Feito sob medida para quem vive com pano, vassoura e agenda cheia</h2>
              <p>O ClientePro é ideal para:</p>
            </div>

            <ul className="check-list">
              <li>Empresas de limpeza residencial e comercial.</li>
              <li>Profissionais autônomos que já têm uma carteira de clientes.</li>
              <li>
                Quem usa caderno, planilha ou WhatsApp e sente que está perdendo o controle da
                agenda e dos pagamentos.
              </li>
            </ul>
          </div>
        </section>

        {/* PROBLEMAS */}
        <section id="problemas" className="section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Problemas que resolvemos</span>
              <h2>Chega de esquecer limpeza, confundir valores e perder dinheiro</h2>
              <p>Com o ClientePro você deixa o improviso para trás e trabalha com clareza.</p>
            </div>

            <div className="problem-grid">
              <div className="problem-card">
                <h3>Esquecendo cliente ou horário?</h3>
                <p>
                  A agenda inteligente lembra você de cada visita, recorrência e horário. Acabou o
                  “pode vir amanhã?” anotado no papel.
                </p>
              </div>
              <div className="problem-card">
                <h3>Não sabe quem já pagou?</h3>
                <p>
                  O painel financeiro mostra, em segundos, quem está em dia e quem ainda está
                  devendo. Sem mais “quando é mesmo que deposito?”.
                </p>
              </div>
              <div className="problem-card">
                <h3>Informação espalhada em mil lugares?</h3>
                <p>
                  Clientes, histórico, valores e observações ficam em um único sistema. Você sabe
                  tudo sobre cada casa antes de chegar lá.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Como funciona</span>
              <h2>Como o ClientePro organiza seu dia a dia</h2>
              <p>Em três passos você tira a bagunça da planilha e coloca tudo no automático.</p>
            </div>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Cadastre seus clientes</h3>
                <p>
                  Nome, endereço, telefone, tipo de serviço, valor e observações (pets, código do
                  prédio, preferências).
                </p>
                <p className="step-note">Tudo fica salvo e pronto para virar agendamento.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Monte sua agenda automática</h3>
                <p>Marque limpezas únicas ou recorrentes (semanal, quinzenal, mensal).</p>
                <p className="step-note">
                  A agenda mensal e semanal mostram exatamente onde você precisa estar em cada dia.
                </p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Comece o dia e feche o caixa</h3>
                <p>
                  Na tela Start, você vê os serviços de hoje, inicia, conclui ou cancela com um
                  clique.
                </p>
                <p className="step-note">
                  Cada serviço concluído alimenta o Financeiro, que mostra quanto entrou no mês e
                  quem ainda precisa pagar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section id="funcionalidades" className="section section-alt">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Funcionalidades</span>
              <h2>Tudo que sua empresa de limpeza precisa em um só sistema</h2>
              <p>Organize clientes, operações e financeiro sem depender de ferramentas soltas.</p>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <h3>Clientes</h3>
                <p>
                  Cadastre clientes com histórico, observações, tipo de serviço e valor padrão.
                  Enxergue sua base ativa e nunca mais esqueça quanto cobra em cada casa.
                </p>
              </div>
              <div className="feature-card">
                <h3>Start — Começar o dia</h3>
                <p>
                  Veja os serviços do dia, inicie e conclua limpezas em tempo real. Acompanhe tempo
                  estimado x tempo trabalhado e mantenha sua equipe focada.
                </p>
              </div>
              <div className="feature-card">
                <h3>Agenda mensal e semanal</h3>
                <p>
                  Visual moderno para organizar rota e compromissos. Filtre por status e planeje sua
                  semana sem estresse.
                </p>
              </div>
              <div className="feature-card">
                <h3>Financeiro</h3>
                <p>
                  Receitas, pagamentos pendentes, ticket médio e histórico de serviços concluídos.
                  Marque pagamentos e saiba exatamente quanto entrou no mês.
                </p>
              </div>
              <div className="feature-card">
                <h3>Faturas e cobranças</h3>
                <p>
                  Gere faturas simples a partir dos serviços concluídos e envie por e-mail. Facilite
                  a cobrança e profissionalize a relação com o cliente.
                </p>
              </div>
              <div className="feature-card">
                <h3>Perfil e personalização</h3>
                <p>
                  Use o nome da sua empresa, cor primária e logo dentro do sistema. Mostre
                  profissionalismo em cada interação.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section id="beneficios" className="section section-alt">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Benefícios</span>
              <h2>O que muda na sua empresa quando você usa o ClientePro</h2>
            </div>

            <div className="benefits-list">
              <div className="benefit-card">
                <strong>Menos esquecimento, mais recorrência.</strong>
                <p>Você para de perder limpeza por erro de agenda.</p>
              </div>
              <div className="benefit-card">
                <strong>Fim da confusão de valores.</strong>
                <p>Cada cliente tem seu preço salvo. Sem “quanto mesmo eu cobro ali?”.</p>
              </div>
              <div className="benefit-card">
                <strong>Visão clara do mês.</strong>
                <p>Em segundos você sabe quanto já faturou e quanto ainda tem pra receber.</p>
              </div>
              <div className="benefit-card">
                <strong>Mais profissionalismo com o cliente.</strong>
                <p>Faturas, organização e comunicação séria aumentam confiança e indicações.</p>
              </div>
              <div className="benefit-card">
                <strong>Você sai do modo “apagar incêndio”.</strong>
                <p>Em vez de reagir, você passa a controlar sua operação todos os dias.</p>
              </div>
            </div>
      </div>
        </section>

        {/* PLANO */}
        <section id="plano" className="section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Plano &amp; Trial</span>
              <h2>Comece com 30 dias grátis – sem compromisso</h2>
              <p>
                Teste o ClientePro no dia a dia da sua empresa. Se não fizer sentido depois de 30
                dias, é só cancelar.
        </p>
      </div>

            <div className="plan-wrapper">
              <div className="plan-card">
                <h3>Plano Profissional</h3>
                <p className="pricing-subtitle">Ideal para empresas e autônomos</p>

                <div className="pricing-price">
                  <span>R$ 97</span>
                  <span className="pricing-period">/mês após o período de teste</span>
                </div>

                <ul className="pricing-list">
                  <li>Até 500 clientes</li>
                  <li>Agenda completa com recorrências</li>
                  <li>Financeiro básico + faturas</li>
                  <li>Suporte por e-mail</li>
                </ul>

                <button className="btn btn-primary btn-full">Criar conta gratuita agora</button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section section-alt">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Dúvidas frequentes</span>
              <h2>Respostas rápidas antes de você testar</h2>
            </div>

            <div className="faq-grid">
              <details className="faq-item" open>
                <summary>Preciso instalar algo no computador?</summary>
                <p>
                  Não. O ClientePro funciona direto pelo navegador. Se quiser, pode instalar como
                  aplicativo no celular.
                </p>
              </details>
              <details className="faq-item">
                <summary>Funciona no celular?</summary>
                <p>
                  Sim. O sistema é responsivo e pode ser “instalado” como app (PWA) em Android e
                  iPhone.
                </p>
              </details>
              <details className="faq-item">
                <summary>Preciso de cartão pra testar?</summary>
                <p>
                  Não. O teste de 30 dias é sem cartão de crédito. Testou, gostou, aí sim você
                  escolhe continuar.
                </p>
              </details>
              <details className="faq-item">
                <summary>Consigo usar em mais de um dispositivo?</summary>
                <p>
                  Sim. Você pode acessar a mesma conta do computador, tablet ou celular com total
                  segurança.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* CALL FINAL */}
        <section className="section final-call">
          <div className="container final-call-content">
            <h2>
              Pronto para sair do caos e <span className="gradient-text">ter sua limpeza sob controle?</span>
            </h2>
            <p>Em poucos dias você sabe exatamente quem limpar, quando ir e quanto recebeu.</p>
            <button className="btn btn-primary btn-lg">Começar teste grátis</button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="logo-area">
              <div className="logo-mark">CP</div>
              <div className="logo-text">
                <span className="logo-title">ClientePro</span>
              </div>
            </div>
            <p className="footer-description">
              Sistema simples e focado em empresas de limpeza. Deixa o complicado com a gente e
              organize clientes, agenda e financeiro em minutos.
            </p>
          </div>
          <div className="footer-column">
            <h4>Links</h4>
            <a href="#como-funciona">Como funciona</a>
            <a href="#plano">Plano</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-column">
            <h4>Legal</h4>
            <a href="#">Política de privacidade</a>
            <a href="#">Termos de uso</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ClientePro. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  )
}

export default App
