import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, 'ACTIVE' | 'PAUSED' | 'INACTIVE'> = {
  ativo: 'ACTIVE',
  inativo: 'INACTIVE',
  pausado: 'PAUSED',
};

type CsvRow = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceType?: string;
  status?: string;
  defaultPrice?: string;
};

const sanitize = (value: string) => value.replace(/^"|"$/g, '').trim();

const parseLine = (line: string): CsvRow | null => {
  const cleaned = line.trim();
  if (!cleaned) {
    return null;
  }
  const parts = cleaned.split('";"').map((part) => sanitize(part));
  if (!parts.length) {
    return null;
  }

  const [name, email, phone, address, serviceType, status, defaultPrice] = parts;
  if (!name) {
    return null;
  }

  return {
    name,
    email: email || undefined,
    phone: phone || undefined,
    address: address || undefined,
    serviceType: serviceType || undefined,
    status: status || undefined,
    defaultPrice: defaultPrice || undefined,
  };
};

const parsePrice = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapStatus = (value?: string) => {
  if (!value) {
    return 'ACTIVE';
  }
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return STATUS_MAP[normalized] ?? 'ACTIVE';
};

async function main() {
  const [, , csvPathArg, ownerEmail] = process.argv;
  if (!csvPathArg || !ownerEmail) {
    console.error('Uso: npx tsx scripts/importCustomersFromCsv.ts <caminho_csv> <email_do_owner>');
    process.exit(1);
  }

  const filePath = path.resolve(csvPathArg);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, email: true },
  });

  if (!owner) {
    console.error(`Usuário com e-mail ${ownerEmail} não encontrado.`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  lines.shift(); // remove header

  const rows = lines
    .map(parseLine)
    .filter((row): row is CsvRow => row !== null && Boolean(row.name && row.name.trim().length));

  console.log(`Importando ${rows.length} clientes para ${owner.email}...`);

  let created = 0;
  for (const row of rows) {
    try {
      await prisma.customer.create({
        data: {
          userId: owner.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          serviceType: row.serviceType,
          status: mapStatus(row.status),
          defaultPrice: parsePrice(row.defaultPrice),
        },
      });
      created += 1;
    } catch (error) {
      console.error(`Erro ao criar cliente ${row.name}:`, error);
    }
  }

  console.log(`Importação concluída. Clientes criados: ${created}`);
}

main()
  .catch((error) => {
    console.error('Erro na importação:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


