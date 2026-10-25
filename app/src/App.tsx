import { useState } from 'react';

export function App() {
  const [dark, setDark] = useState(false);

  return (
    <main className="foundation" data-theme={dark ? 'dark' : 'light'}>
      <div className="content">
        <header className="masthead">
          <span className="brand"><span className="brand-mark" aria-hidden="true">A</span> Atlas Financeiro</span>
          <button type="button" aria-pressed={dark} onClick={() => setDark((previous) => !previous)}>
            {dark ? 'Usar tema claro' : 'Usar tema escuro'}
          </button>
        </header>
        <section className="intro" aria-labelledby="foundation-title">
          <p className="eyebrow">Incremento 1 · Ambiente local</p>
          <h1 id="foundation-title">Fundação local</h1>
          <p className="lead">A base para organizar suas finanças com clareza e precisão.</p>
          <p className="stage-note">Esta etapa ainda não recebe lançamentos pessoais.</p>
        </section>
        <section className="foundation-card" aria-labelledby="base-title">
          <h2 id="base-title">Estrutura desta etapa</h2>
          <ul>
            <li><strong>Domínio financeiro</strong><span>Cálculos exatos em centavos e regras separadas da interface.</span></li>
            <li><strong>Persistência local</strong><span>Modelo inicial para contas, eventos, liquidações e contrapartidas.</span></li>
            <li><strong>Dados pessoais</strong><span>Sem importação automática de informações históricas.</span></li>
          </ul>
        </section>
        <details>
          <summary>Próxima etapa</summary>
          <p>Contas, categorias e registro de movimentações serão construídos no Incremento 2, após aprovação.</p>
          <p>Login com Google, sincronização e restauração seguem nas etapas previstas no plano.</p>
        </details>
        <footer>pt-BR · BRL · America/Fortaleza</footer>
      </div>
    </main>
  );
}
