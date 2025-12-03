import PDFDocument from 'pdfkit';
import type { Contract, Prisma } from '@prisma/client';

type PDFDocumentType = InstanceType<typeof PDFDocument>;

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

const drawCardSection = (
  doc: PDFDocumentType,
  title: string,
  body: string | (string | null | undefined)[],
  accentColor: string,
) => {
  const content = (Array.isArray(body) ? body : [body]).filter(
    (line): line is string => Boolean(line && line.trim()),
  );
  if (!content.length) return;

  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const sampleText = `${title}\n${content.join('\n')}`;
  doc.fontSize(11);
  const sectionHeight = doc.heightOfString(sampleText, { width }) + 18;
  const startY = doc.y;

  doc
    .save()
    .roundedRect(doc.page.margins.left - 6, startY - 6, width + 12, sectionHeight + 6, 12)
    .fillAndStroke('#f8fafc', '#e2e8f0')
    .restore();

  doc.fillColor(accentColor).fontSize(11).text(title.toUpperCase(), {
    characterSpacing: 0.5,
  });
  doc.moveDown(0.2);
  content.forEach((line) => doc.fillColor('#1f2937').fontSize(11).text(line));
  doc.moveDown(0.8);
};

const buildBodyFallback = (doc: PDFDocumentType, body: string, accentColor: string) => {
  drawCardSection(doc, 'AGREEMENT', body, accentColor);
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
  const accentColor = blueprint?.brand?.accentColor || '#22c55e';

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', (data) => buffers.push(data as Buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (error) => reject(error));

    const title = contract.title || 'Cleaning Agreement';
    const headerHeight = 120;
    const headerY = doc.y;

    doc
      .save()
      .rect(0, headerY, doc.page.width, headerHeight)
      .fill(accentColor)
      .restore();

    doc
      .fillColor('#ffffff')
      .fontSize(24)
      .text(title, doc.page.margins.left, headerY + 24, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });
    doc
      .fillColor('#d1fae5')
      .fontSize(11)
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} • Contrato ${contract.id}`, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });

    doc.y = headerY + headerHeight + 20;
    doc.moveDown(0.5);

    drawCardSection(
      doc,
      'Empresa',
      [
        contract.owner?.companyName || contract.owner?.name || 'Sua equipe',
        contract.owner?.email ? `Email: ${contract.owner.email}` : null,
        contract.owner?.contactPhone ? `Telefone: ${contract.owner.contactPhone}` : null,
        contract.owner?.whatsappNumber ? `WhatsApp: ${contract.owner.whatsappNumber}` : null,
      ],
      accentColor,
    );

    drawCardSection(
      doc,
      'Cliente',
      [
        blueprint?.client?.name || contract.client?.name || 'Cliente',
        blueprint?.client?.email || contract.client?.email
          ? `Email: ${blueprint?.client?.email ?? contract.client?.email}`
          : null,
        blueprint?.client?.phone || contract.client?.contactPhone
          ? `Telefone: ${blueprint?.client?.phone ?? contract.client?.contactPhone}`
          : null,
        blueprint?.client?.address ? `Endereço: ${blueprint.client.address}` : null,
      ],
      accentColor,
    );

    if (blueprint) {
      drawCardSection(
        doc,
        'Plano contratado',
        [
          `Frequência: ${blueprint.client?.frequency ?? 'Custom'}`,
          `Valor por visita: ${formatUSD(blueprint.payment?.amount ?? blueprint.client?.pricePerVisit)}`,
          `Início: ${blueprint.startDate ?? 'A combinar'}`,
          `Acesso: ${blueprint.access?.method ?? 'A combinar'}`,
        ],
        accentColor,
      );

      const services = mapServices(blueprint);
      if (services.length) {
        drawCardSection(
          doc,
          'Itens incluídos',
          services.map((service) => `• ${service}`),
          accentColor,
        );
      }

      drawCardSection(
        doc,
        'Pagamento e políticas',
        [
          `Forma de cobrança: ${blueprint.payment?.billingType ?? 'Custom'}`,
          blueprint.payment?.paymentMethods?.length
            ? `Métodos aceitos: ${blueprint.payment.paymentMethods.join(', ')}`
            : 'Métodos conforme disponibilidade.',
          blueprint.payment?.latePolicy
            ? `Atrasos: ${blueprint.payment.latePolicy}`
            : 'Política de atraso conforme contrato.',
        ],
        accentColor,
      );

      drawCardSection(doc, 'Cancelamentos', blueprint.cancellation ?? 'Conforme combinado com a equipe.', accentColor);

      if (blueprint.access?.notes) {
        drawCardSection(doc, 'Observações de acesso', blueprint.access.notes, accentColor);
      }
    } else {
      buildBodyFallback(doc, contract.body, accentColor);
    }

    doc.end();
  });
};

