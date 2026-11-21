import { isEntitySelectable, type FinancialDataset } from '../domain';

const template = [
  {
    "kind": "expense",
    "name": "Alimentação",
    "children": [
      "Supermercado e mercado",
      "Padaria",
      "Lanches",
      "Restaurantes",
      "Açaí e sobremesas",
      "Delivery",
      "Outros alimentos"
    ]
  },
  {
    "kind": "expense",
    "name": "Transporte",
    "children": [
      "Ônibus",
      "Bilhete Único",
      "Transporte por aplicativo",
      "Combustível",
      "Manutenção de veículo",
      "Outros transportes"
    ]
  },
  {
    "kind": "expense",
    "name": "Moradia",
    "children": [
      "Água",
      "Energia",
      "Manutenção residencial",
      "Produtos e utilidades domésticas",
      "Outras despesas domésticas"
    ]
  },
  {
    "kind": "expense",
    "name": "Serviços e assinaturas",
    "children": [
      "Internet residencial",
      "Telefonia e recargas",
      "ChatGPT",
      "Spotify",
      "Streaming",
      "Software e serviços digitais",
      "Outros serviços"
    ]
  },
  {
    "kind": "expense",
    "name": "Educação",
    "children": [
      "Faculdade",
      "Mensalidades",
      "Cursos",
      "Livros e materiais",
      "Certificados e inscrições",
      "Outras despesas educacionais"
    ]
  },
  {
    "kind": "expense",
    "name": "Saúde e bem-estar",
    "children": [
      "Farmácia",
      "Consultas e exames",
      "Academia",
      "Suplementos",
      "Cuidados pessoais",
      "Barbearia",
      "Outros cuidados"
    ]
  },
  {
    "kind": "expense",
    "name": "Compras pessoais",
    "children": [
      "Roupas",
      "Calçados",
      "Eletrônicos",
      "Acessórios",
      "Equipamentos de informática",
      "Outros produtos"
    ]
  },
  {
    "kind": "expense",
    "name": "Lazer",
    "children": [
      "Jogos",
      "Passeios",
      "Cinema",
      "Encontros",
      "Entretenimento",
      "Outros gastos de lazer"
    ]
  },
  {
    "kind": "expense",
    "name": "Fé e doações",
    "children": [
      "Dízimos",
      "Ofertas",
      "Doações",
      "Contribuições religiosas"
    ]
  },
  {
    "kind": "expense",
    "name": "Finanças",
    "children": [
      "Tarifas bancárias",
      "Juros",
      "Encargos",
      "Impostos e taxas",
      "Custos de operações de crédito"
    ]
  },
  {
    "kind": "expense",
    "name": "Outros",
    "children": [
      "Despesa não identificada",
      "Despesas diversas"
    ]
  },
  {
    "kind": "income",
    "name": "Trabalho",
    "children": [
      "Salário",
      "Trabalho autônomo",
      "Serviços de informática",
      "Suporte técnico",
      "Outras atividades profissionais"
    ]
  },
  {
    "kind": "income",
    "name": "Rendas recorrentes",
    "children": [
      "Aluguel recebido",
      "Outras rendas recorrentes"
    ]
  },
  {
    "kind": "income",
    "name": "Reembolsos",
    "children": [
      "Transporte",
      "Compras",
      "Despesas profissionais",
      "Outros reembolsos"
    ]
  },
  {
    "kind": "income",
    "name": "Rendimentos",
    "children": [
      "Juros de investimentos",
      "Rendimentos financeiros",
      "Outras receitas financeiras"
    ]
  },
  {
    "kind": "income",
    "name": "Outras receitas",
    "children": [
      "Ajuda financeira",
      "Presentes recebidos",
      "Receitas não identificadas",
      "Receitas diversas"
    ]
  }
] as const;

const aliases: Readonly<Record<string, readonly string[]>> = {
  'supermercado e mercado': ['supermercado', 'mercado'],
  'transporte por aplicativo': ['transporte por app'],
  'telefonia e recargas': ['telefonia'],
};

function normalize(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function categoryTemplatePreview(dataset: Pick<FinancialDataset, 'categories' | 'entityLifecycles'>, userId: string) {
  return template.flatMap(({ kind, name, children }) => {
    const find = (label: string, parentId?: string) => {
      const key = normalize(label);
      return dataset.categories.filter(category => category.userId === userId && category.parentId === parentId
        && [key, ...(aliases[key] ?? [])].includes(normalize(category.name)));
    };
    const status = (matches: ReturnType<typeof find>): 'create' | 'keep' | 'review' => {
      if (matches.length === 0) return 'create';
      if (matches.length > 1) return 'review';
      const [category] = matches;
      return category && (category.kind === kind || category.kind === 'both')
        && isEntitySelectable(dataset.entityLifecycles ?? [], userId, 'category', category.id) ? 'keep' : 'review';
    };
    const parents = find(name);
    const rootStatus = status(parents);
    const parentId = parents[0]?.id;
    return [
      { kind, name, group: undefined, parentId: undefined, status: rootStatus },
      ...children.map(child => ({
        kind, name: child, group: name, parentId,
        status: rootStatus === 'review' ? 'review' as const : parentId === undefined ? 'create' as const : status(find(child, parentId)),
      })),
    ];
  });
}
