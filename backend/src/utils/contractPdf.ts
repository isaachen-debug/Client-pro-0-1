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
  cancellationPolicy?: string;
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

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const bigint = parseInt(full, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const lighten = (hex: string, amount: number) => {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
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
  const accentDark = lighten(accentColor, -0.12);
  const accentLight = lighten(accentColor, 0.9);
  const accentBorder = lighten(accentColor, 0.7);
  const secondaryText = '#475569';

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', (data) => buffers.push(data as Buffer));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (error) => reject(error));

    const title = contract.title || 'Cleaning Agreement';
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header mais sóbrio
    const headerHeight = 110;
    const headerY = doc.y;
    doc.save().rect(0, headerY, doc.page.width, headerHeight).fill(accentDark).restore();

    doc
      .fillColor('#ffffff')
      .fontSize(21)
      .font('Helvetica-Bold')
      .text(title, doc.page.margins.left, headerY + 24, { width: pageWidth });

    doc
      .fillColor('#e2e8f0')
      .fontSize(10)
      .font('Helvetica')
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}  •  Contrato ${contract.id}`, {
        width: pageWidth,
      });

    const contactLines = [
      contract.owner?.email ? `Email: ${contract.owner.email}` : null,
      contract.owner?.contactPhone ? `Telefone: ${contract.owner.contactPhone}` : null,
      contract.owner?.whatsappNumber ? `WhatsApp: ${contract.owner.whatsappNumber}` : null,
    ].filter(Boolean);
    if (contactLines.length) {
      doc
        .fillColor('#f8fafc')
        .fontSize(10)
        .text(contactLines.join('   •   '), {
          width: pageWidth,
          align: 'left',
        });
    }

    doc.y = headerY + headerHeight + 28;

    // Parties
    const providerName = contract.owner?.companyName || contract.owner?.name || 'Sua equipe';
    const clientName = blueprint?.client?.name || contract.client?.name || 'Cliente';
    const tableWidth = pageWidth;
    const colWidth = tableWidth / 2 - 6;

    const drawInfoBlock = (label: string, rows: string[], x: number) => {
      const height = rows.length * 16 + 30;
      const y = doc.y;
      doc
        .save()
        .rect(x, y, colWidth, height)
        .fill('#ffffff')
        .stroke('#e2e8f0')
        .restore();
      doc
        .fillColor(accentColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(label, x + 10, y + 10);
      doc.fillColor(secondaryText).fontSize(10).font('Helvetica');
      rows.forEach((row) => {
        doc.text(row, {
          width: colWidth - 20,
          continued: false,
          align: 'left',
        });
      });
    };

    const startY = doc.y;
    drawInfoBlock(
      'Prestador',
      [
        providerName,
        contract.owner?.email ? `Email: ${contract.owner.email}` : 'Email não informado',
        contract.owner?.contactPhone ? `Telefone: ${contract.owner.contactPhone}` : 'Telefone não informado',
      ],
      doc.page.margins.left,
    );
    drawInfoBlock(
      'Cliente',
      [
        clientName,
        blueprint?.client?.email || contract.client?.email
          ? `Email: ${blueprint?.client?.email ?? contract.client?.email}`
          : 'Email não informado',
        blueprint?.client?.phone || contract.client?.contactPhone
          ? `Telefone: ${blueprint?.client?.phone ?? contract.client?.contactPhone}`
          : 'Telefone não informado',
        blueprint?.client?.address ? `Endereço: ${blueprint.client.address}` : '',
      ].filter(Boolean),
      doc.page.margins.left + colWidth + 12,
    );
    doc.y = startY + 110;
    doc.moveDown(0.5);

    const drawSection = (index: number, titleText: string, lines: (string | null | undefined)[]) => {
      const content = lines.filter((l): l is string => Boolean(l && l.trim()));
      if (!content.length) return;
      const boxWidth = pageWidth;
      const sectionSample = `${titleText}\n${content.join('\n')}`;
      doc.fontSize(11);
      const sectionHeight = doc.heightOfString(sectionSample, { width: boxWidth - 24 }) + 22;
      const y = doc.y;
      doc
        .save()
        .roundedRect(doc.page.margins.left - 4, y, boxWidth + 8, sectionHeight, 10)
        .fill('#ffffff')
        .lineWidth(1)
        .stroke('#e2e8f0')
        .restore();
      // Número em bolacha
      doc
        .save()
        .circle(doc.page.margins.left + 14, y + 16, 10)
        .fill(accentColor)
        .restore();
      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${index}`, doc.page.margins.left + 8, y + 11, { width: 12 });
      doc
        .fillColor(accentColor)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(titleText, doc.page.margins.left + 32, y + 10);
      doc.moveDown(0.2);
      doc.fillColor(secondaryText).fontSize(11).font('Helvetica');
      content.forEach((line) => doc.text(line, { width: boxWidth - 24, indent: 8 }));
      doc.moveDown(0.6);
    };

    if (blueprint) {
      const services = mapServices(blueprint);
      drawSection(
        1,
        'Serviços incluídos',
        services.length ? services.map((s) => `• ${s}`) : ['Detalhamento conforme combinado.'],
      );

      drawSection(2, 'Plano e agenda', [
        `Frequência: ${blueprint.client?.frequency ?? 'Custom'}`,
        `Valor por visita: ${formatUSD(blueprint.payment?.amount ?? blueprint.client?.pricePerVisit)}`,
        `Início: ${blueprint.startDate ?? 'A combinar'}`,
        `Acesso: ${blueprint.access?.method ?? 'A combinar'}`,
      ]);

      drawSection(3, 'Pagamento', [
        `Forma de cobrança: ${blueprint.payment?.billingType ?? 'Custom'}`,
        blueprint.payment?.paymentMethods?.length
          ? `Métodos aceitos: ${blueprint.payment.paymentMethods.join(', ')}`
          : 'Métodos conforme disponibilidade.',
        blueprint.payment?.latePolicy ? `Atrasos: ${blueprint.payment.latePolicy}` : null,
      ]);

      drawSection(4, 'Cancelamentos e reagendamentos', [
        blueprint.cancellationPolicy ||
          blueprint.cancellation ||
          'Cancelamentos/reagendamentos com até 24h de antecedência. Menos de 24h podem gerar taxa de cancelamento.',
      ]);

      if (blueprint.access?.notes) {
        drawSection(5, 'Observações de acesso', [blueprint.access.notes]);
      }
    } else {
      buildBodyFallback(doc, contract.body, accentColor);
    }

    // Signatures
    doc.moveDown(1);
    const sigWidth = (pageWidth - 24) / 2;
    const drawSig = (label: string, name?: string | null, offsetX = 0) => {
      const y = doc.y + 10;
      const x = doc.page.margins.left + offsetX;
      doc
        .moveTo(x + 4, y)
        .lineTo(x + sigWidth, y)
        .strokeColor('#e2e8f0')
        .stroke();
      doc
        .fillColor(secondaryText)
        .fontSize(10)
        .font('Helvetica')
        .text(label, x + 4, y + 6, { width: sigWidth });
      if (name) {
        doc.font('Helvetica-Bold').text(name, x + 4, y + 18, { width: sigWidth });
        doc.font('Helvetica');
      }
    };
    drawSig('Prestador', providerName, 0);
    drawSig('Cliente', clientName, sigWidth + 24);

    doc.end();
  });
};
