export interface LegalDocumentTemplateVariable {
  key: string;
  label: string;
  required?: boolean;
}

export interface LegalDocumentTemplate {
  id: string;
  title: string;
  type: string;
  description: string;
  variables: LegalDocumentTemplateVariable[];
  content: string;
}

const TEMPLATES: LegalDocumentTemplate[] = [
  {
    id: 'nda-basic',
    title: 'Non-Disclosure Agreement (Basic)',
    type: 'NDA',
    description: 'A simple NDA for early-stage conversations.',
    variables: [
      { key: 'effectiveDate', label: 'Effective Date', required: true },
      { key: 'disclosingParty.name', label: 'Disclosing Party Name', required: true },
      { key: 'receivingParty.name', label: 'Receiving Party Name', required: true },
      { key: 'termMonths', label: 'Term (months)', required: true },
      { key: 'governingLaw', label: 'Governing Law', required: true },
    ],
    content:
      'NON-DISCLOSURE AGREEMENT\n\n' +
      'This Non-Disclosure Agreement ("Agreement") is made effective as of {{effectiveDate}} between {{disclosingParty.name}} ("Disclosing Party") and {{receivingParty.name}} ("Receiving Party").\n\n' +
      '1. Confidential Information. "Confidential Information" means any non-public business, technical, or financial information disclosed by Disclosing Party.\n' +
      '2. Obligations. Receiving Party agrees to keep Confidential Information confidential and to use it only for evaluating a potential business relationship.\n' +
      '3. Term. The obligations under this Agreement continue for {{termMonths}} months from the Effective Date.\n' +
      '4. Governing Law. This Agreement is governed by the laws of {{governingLaw}}.\n\n' +
      'Signed:\n\n' +
      'Disclosing Party: _____________________\n' +
      'Receiving Party:  _____________________\n',
  },
  {
    id: 'service-agreement-basic',
    title: 'Service Agreement (Basic)',
    type: 'SERVICE_AGREEMENT',
    description: 'A simple service agreement template for a small engagement.',
    variables: [
      { key: 'effectiveDate', label: 'Effective Date', required: true },
      { key: 'provider.name', label: 'Service Provider Name', required: true },
      { key: 'client.name', label: 'Client Name', required: true },
      { key: 'services', label: 'Description of Services', required: true },
      { key: 'fee', label: 'Fee', required: true },
      { key: 'paymentTerms', label: 'Payment Terms', required: true },
    ],
    content:
      'SERVICE AGREEMENT\n\n' +
      'Effective Date: {{effectiveDate}}\n\n' +
      'Between {{provider.name}} ("Provider") and {{client.name}} ("Client").\n\n' +
      '1. Services. Provider will perform: {{services}}\n' +
      '2. Fees. Client will pay: {{fee}}\n' +
      '3. Payment Terms. {{paymentTerms}}\n\n' +
      'Signed:\n\n' +
      'Provider: _____________________\n' +
      'Client:   _____________________\n',
  },
  {
    id: 'invoice-basic',
    title: 'Invoice (Basic)',
    type: 'INVOICE',
    description: 'A basic invoice template.',
    variables: [
      { key: 'invoiceNumber', label: 'Invoice Number', required: true },
      { key: 'invoiceDate', label: 'Invoice Date', required: true },
      { key: 'business.name', label: 'Business Name', required: true },
      { key: 'client.name', label: 'Client Name', required: true },
      { key: 'amountDue', label: 'Amount Due', required: true },
      { key: 'dueDate', label: 'Due Date', required: true },
    ],
    content:
      'INVOICE\n\n' +
      'Invoice #: {{invoiceNumber}}\n' +
      'Invoice Date: {{invoiceDate}}\n' +
      'From: {{business.name}}\n' +
      'Bill To: {{client.name}}\n\n' +
      'Total Due: {{amountDue}}\n' +
      'Due Date: {{dueDate}}\n',
  },
];

export function listLegalDocumentTemplates(): LegalDocumentTemplate[] {
  return TEMPLATES;
}

export function getLegalDocumentTemplateById(templateId: string): LegalDocumentTemplate | undefined {
  return TEMPLATES.find((t) => t.id === templateId);
}

function getByPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj);
}

export function renderTemplateContent(
  content: string,
  variables: Record<string, any> = {}
): { content: string; missingVariables: string[] } {
  const missing = new Set<string>();

  const rendered = content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, rawKey) => {
    const key = String(rawKey);
    const value = getByPath(variables, key);
    if (value === undefined || value === null || value === '') {
      missing.add(key);
      return '';
    }
    return String(value);
  });

  return { content: rendered, missingVariables: Array.from(missing).sort() };
}

export function renderLegalDocumentTemplate(
  templateId: string,
  variables: Record<string, any> = {}
): { template: LegalDocumentTemplate; content: string; missingVariables: string[] } {
  const template = getLegalDocumentTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const { content, missingVariables } = renderTemplateContent(template.content, variables);
  return { template, content, missingVariables };
}
