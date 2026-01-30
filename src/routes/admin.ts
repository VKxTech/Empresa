import { Router } from 'express';
import { prisma, logger } from '../server.js';
import { isAuthenticated } from '../middlewares/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/login', (req, res) => {
    res.render('admin/login', { title: 'Admin Login', layout: false });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma.adminUser.findUnique({ where: { email } });

    if (admin && await bcrypt.compare(password, admin.passwordHash)) {
        (req.session as any).adminId = admin.id;
        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() }
        });
        return res.redirect('/admin');
    }
    res.render('admin/login', { error: 'Credenciais inválidas', layout: false });
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    const leadsCount = await prisma.lead.count();
    const requestsCount = await prisma.request.count();
    const paidInvoices = await prisma.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
    });

    res.render('admin/dashboard', { 
        title: 'Dashboard',
        layout: 'layouts/admin',
        stats: {
            leads: leadsCount,
            requests: requestsCount,
            revenue: paidInvoices._sum.amount || 0
        }
    });
});

router.get('/leads', async (req, res) => {
    const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/leads-list', { title: 'Gerenciar Leads', layout: 'layouts/admin', leads });
});

router.get('/leads/:id', async (req, res) => {
    const lead = await prisma.lead.findUnique({
        where: { id: req.params.id },
        include: { 
            requests: { orderBy: { createdAt: 'desc' } }, 
            invoices: true, 
            quotes: true,
            commercialDocs: true 
        }
    });
    if (!lead) return res.redirect('/admin/leads');
    res.render('admin/lead-detail', { title: `Detalhes: ${lead.name}`, layout: 'layouts/admin', lead });
});

router.post('/leads/:id/update', async (req, res) => {
    const { status, notes } = req.body;
    await prisma.lead.update({
        where: { id: req.params.id },
        data: { status, notes }
    });
    res.redirect(`/admin/leads/${req.params.id}`);
});

router.post('/leads/:id/fiscal', async (req, res) => {
    const { nfStatus, nfNumber } = req.body;
    await prisma.lead.update({
        where: { id: req.params.id },
        data: { 
            nfStatus, 
            nfNumber,
            nfIssuedAt: nfStatus === 'Emitida' ? new Date() : null
        }
    });
    res.redirect(`/admin/leads/${req.params.id}`);
});

router.get('/invoices', async (req, res) => {
    const invoices = await prisma.invoice.findMany({
        include: { lead: true },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/invoices-list', { title: 'Faturas e Pagamentos', layout: 'layouts/admin', invoices });
});

router.get('/invoices/new', async (req, res) => {
    const leads = await prisma.lead.findMany();
    res.render('admin/invoice-new', { title: 'Novo Link de Pagamento', layout: 'layouts/admin', leads });
});

router.post('/invoices/new', async (req, res) => {
    const { leadId, amount, description, dueAt } = req.body;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await prisma.invoice.create({
        data: {
            leadId,
            amount: parseFloat(amount),
            description,
            dueAt: new Date(dueAt),
            token,
            provider: process.env.PAYMENT_PROVIDER || 'mercadopago',
            status: 'pending'
        }
    });
    res.redirect('/admin/invoices');
});

router.get('/quotes', async (req, res) => {
    const quotes = await prisma.quote.findMany({
        include: { lead: true },
        orderBy: { createdAt: 'desc' }
    });
    res.render('admin/quotes-list', { title: 'Orçamentos', layout: 'layouts/admin', quotes });
});

router.get('/quotes/new', async (req, res) => {
    const leads = await prisma.lead.findMany();
    const leadId = req.query.leadId as string;
    let selectedLead = null;
    let suggestedItems: any[] = [];
    
    if (leadId) {
        selectedLead = await prisma.lead.findUnique({ 
            where: { id: leadId },
            include: { requests: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });
        
        // Intelligent Scaffolding
        const lastRequest = selectedLead?.requests[0];
        if (lastRequest?.projectType === 'App Mobile') {
            suggestedItems = [
                { description: 'Arquitetura e Desenvolvimento iOS/Android (Flutter)', value: 15000 },
                { description: 'Integração de API e Backend de Suporte', value: 8000 },
                { description: 'Design UI/UX Premium', value: 5000 }
            ];
        } else if (lastRequest?.projectType === 'Sistema Web Interno') {
            suggestedItems = [
                { description: 'Desenvolvimento de Dashboard e Gestão Core', value: 12000 },
                { description: 'Segurança e Controle de Acesso', value: 3000 }
            ];
        }
    }

    res.render('admin/quote-new', { 
        title: 'Nova Proposta Comercial', 
        layout: 'layouts/admin', 
        leads, 
        selectedLead,
        suggestedItems
    });
});

router.post('/quotes/new', async (req, res) => {
    const { leadId, title, itemsValue, itemsDesc, estimatedWeeks, paymentTerms } = req.body;
    const items = Array.isArray(itemsDesc) 
        ? itemsDesc.map((desc, i) => ({ description: desc, value: parseFloat(itemsValue[i]) })) 
        : [{ description: itemsDesc, value: parseFloat(itemsValue) }];
    
    const total = items.reduce((acc, curr) => acc + curr.value, 0);

    const quote = await prisma.quote.create({
        data: {
            leadId,
            title,
            items: JSON.stringify(items),
            total,
            estimatedWeeks: parseInt(estimatedWeeks),
            paymentTerms,
            status: 'Gerada'
        }
    });

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    const { PDFService } = await import('../services/pdf.js');
    const pdfPath = await PDFService.generateQuote(quote, lead);

    await prisma.quote.update({
        where: { id: quote.id },
        data: { pdfPath }
    });

    res.redirect(`/admin/leads/${leadId}`);
});

router.get('/documents/generate/:leadId', async (req, res) => {
    const lead = await prisma.lead.findUnique({ 
        where: { id: req.params.leadId },
        include: { requests: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!lead) return res.redirect('/admin/leads');
    
    const projectType = lead.requests[0]?.projectType || 'Software';
    
    // Auto-generate content
    const contractContent = `
CONTRATADA: VKX Technologies (CNPJ: 33.070.993/0001-27)
CONTRATANTE: ${lead.name} (${lead.companyName || 'PF'})

OBJETO: Prestação de serviços de engenharia de software para o projeto: ${projectType}.

CLÁUSULA PRIMEIRA - DO ESCOPO
O projeto consiste no desenvolvimento técnico seguindo os padrões de qualidade da CONTRATADA, conforme detalhado na proposta técnica aprovada.

CLÁUSULA SEGUNDA - PRAZOS E VALORES
Os prazos de entrega e valores seguem o cronograma definido na Proposta Comercial vinculada.
    `.trim();

    const slaContent = `
OBJETO: Acordo de Nível de Serviço (SLA) para ${projectType}.

1. DISPONIBILIDADE
A VKX Technologies garante 99.5% de uptime para a infraestrutura gerenciada sob sua responsabilidade direta.

2. SUPORTE TÉCNICO
Canais: Ticket e WhatsApp Corporativo.
Horário: 09:00 às 18:00 (Dias úteis).
Tempo de Resposta: 4h para incidentes críticos.
    `.trim();

    res.render('admin/document-generate', { 
        title: 'Gerar Documentos Legais', 
        layout: 'layouts/admin', 
        lead, 
        contractContent, 
        slaContent 
    });
});

router.post('/documents/generate', async (req, res) => {
    const { leadId, contractContent, slaContent } = req.body;
    const { PDFService } = await import('../services/pdf.js');
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });

    // Generate Contract
    const contract = await prisma.commercialDocument.create({
        data: { leadId, type: 'CONTRATO', content: contractContent }
    });
    const cPdf = await PDFService.generateCommercialDoc(contract, lead);
    await prisma.commercialDocument.update({ where: { id: contract.id }, data: { pdfPath: cPdf } });

    // Generate SLA
    const sla = await prisma.commercialDocument.create({
        data: { leadId, type: 'SLA', content: slaContent }
    });
    const sPdf = await PDFService.generateCommercialDoc(sla, lead);
    await prisma.commercialDocument.update({ where: { id: sla.id }, data: { pdfPath: sPdf } });

    res.redirect(`/admin/leads/${leadId}`);
});

export default router;
