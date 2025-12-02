import PDFDocument from 'pdfkit';
import type { Contract, Prisma } from '@prisma/client';

type BlueprintServiceAddon = {
  id: string;
  label: string;
  price: number;
};

type ContractBlueprint = {
  brand?: {
    logo?: string;
    accentColor?: string;
  };
  client?: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    frequency?: string;
    pricePerVisit?: number;
  };
  services?: {
    standard?: Record<string, boolean>;
    deep?: Record<string, boolean>;
    custom?: string[];
    addons?: BlueprintServiceAddon[];
  };
  payment?: {
    amount?: number;
    billingType?: string;
    paymentMethods?: string[];
    latePolicy?: string;
  };
  cancellation?: string;
  access?: {
    method?: string;
    notes?: string;
  };
  startDate?: string;
};

const formatUSD = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Custom';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const getContractFileName = (title: string) =>
  (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'contrato'
  ) + '.pdf';

const getBlueprint = (placeholders?: Prisma.JsonValue | null): ContractBlueprint | null => {
  if (!placeholders || typeof placeholders !== 'object') {
    return null;
  }
  const maybeBlueprint =
    (placeholders as Record<string, unknown>)?.blueprint ??
    (placeholders as Record<string, unknown>);
  if (!maybeBlueprint || typeof maybeBlueprint !== 'object') {
    return null;
  }
  return maybeBlueprint as ContractBlueprint;
};

const mapServices = (blueprint: ContractBlueprint | null) => {
  if (!blueprint?.services) return [];
  const items: string[] = [];
  const { standard = {}, deep = {}, custom = [], addons = [] } = blueprint.services;
  Object.entries(standard).forEach(([key, enabled]) => {
    if (enabled) items.push(key);
  });
  Object.entries(deep).forEach(([key, enabled]) => {
    if (enabled) items.push(key);
  });
  custom.forEach((item) => items.push(item));
  addons.forEach((addon) => items.push(`${addon.label} (+${formatUSD(addon.price)})`));
  return items;
};

const drawSection = (doc: PDFDocument, title: string, body: string | string[]) => {
  doc
    .fillColor('#111827')
    .fontSize(13)
    .text(title, { underline: true });
  doc.moveDown(0.3);
  const content = Array.isArray(body) ? body : [body];
  content.forEach((line) => {
    doc.fillColor('#374151').fontSize(11).text(line);
  });
  doc.moveDown();
};

const buildBodyFallback = (doc: PDFDocument, body: string) => {
  drawSection(doc, 'Agreement', body);
};

export const generateContractPdf = async (
  contract: Contract & {
    owner?: {
      name: string | null;
      companyName?: string | null;
      email?: string | null;
      contactPhone?: string | null;
      whatsappNumber?: string | null;
    } | null;
    client?: {
      name: string | null;
      email?: string | null;
      contactPhone?: string | null;
    } | null;
  },
): Promise<Buffer> => {
  const blueprint = getBlueprint(contract.placeholders ?? null);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', (data) => buffers.push(data as Buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (error) => reject(error));

    const title = contract.title || 'Cleaning Agreement';
    doc.fontSize(20).fillColor('#111827').text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} • Contrato ${contract.id}`);
    doc.moveDown();

    drawSection(doc, 'Empresa', [
      contract.owner?.companyName || contract.owner?.name || 'Sua equipe',
      contract.owner?.email ? `Email: ${contract.owner.email}` : '—',
      contract.owner?.contactPhone ? `Telefone: ${contract.owner.contactPhone}` : null,
      contract.owner?.whatsappNumber ? `WhatsApp: ${contract.owner.whatsappNumber}` : null,
    ].filter(Boolean) as string[]);

    drawSection(doc, 'Cliente', [
      blueprint?.client?.name || contract.client?.name || 'Cliente',
      blueprint?.client?.email || contract.client?.email ? `Email: ${blueprint?.client?.email ?? contract.client?.email}` : '—',
      blueprint?.client?.phone || contract.client?.contactPhone
        ? `Telefone: ${blueprint?.client?.phone ?? contract.client?.contactPhone}`
        : null,
      blueprint?.client?.address ? `Endereço: ${blueprint.client.address}` : null,
    ].filter(Boolean) as string[]);

    if (blueprint) {
      drawSection(doc, 'Plano contratado', [
        `Frequência: ${blueprint.client?.frequency ?? 'Custom'}`,
        `Valor por visita: ${formatUSD(blueprint.payment?.amount ?? blueprint.client?.pricePerVisit)}`,
        `Início: ${blueprint.startDate ?? 'A combinar'}`,
        `Acesso: ${blueprint.access?.method ?? 'A combinar'}`,
      ]);

      const services = mapServices(blueprint);
      if (services.length) {
        drawSection(
          doc,
          'Itens incluídos',
          services.map((service) => `• ${service}`),
        );
      }

      drawSection(doc, 'Pagamento e políticas', [
        `Forma de cobrança: ${blueprint.payment?.billingType ?? 'Custom'}`,
        blueprint.payment?.paymentMethods?.length
          ? `Métodos aceitos: ${blueprint.payment.paymentMethods.join(', ')}`
          : 'Métodos conforme disponibilidade.',
        blueprint.payment?.latePolicy
          ? `Atrasos: ${blueprint.payment.latePolicy}`
          : 'Política de atraso conforme contrato.',
      ]);

      drawSection(doc, 'Cancelamentos', blueprint.cancellation ?? 'Conforme combinado com a equipe.');

      if (blueprint.access?.notes) {
        drawSection(doc, 'Observações de acesso', blueprint.access.notes);
      }
    } else {
      buildBodyFallback(doc, contract.body);
    }

    doc.end();
  });
};

