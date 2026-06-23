import { Router } from 'express';
import { MailService } from '../services/mail.js';
import { prisma } from '../server.js';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';

const newsletterLimiter = (rateLimit as any)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { success: false, error: 'Muitas inscrições vindas deste IP. Tente novamente mais tarde.' }
});

const router = Router();

const chargeLeadSchema = z.object({
    name: z.string().trim().min(2, "Informe um nome válido."),
    company: z.string().trim().min(2, "Informe a empresa ou empreendimento."),
    establishmentType: z.string().trim().min(2, "Selecione o tipo de estabelecimento."),
    cityState: z.string().trim().min(2, "Informe a cidade e o estado."),
    whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido."),
    hasCharger: z.enum(['Sim', 'Não']),
    hasParking: z.enum(['Sim', 'Não']),
    message: z.string().trim().max(2000, "Mensagem muito longa.").optional().or(z.literal('')),
    product: z.string().optional(),
    sourcePage: z.string().optional()
});

// Ensure uploads directory exists - Note: Vercel is read-only, only /tmp is writable
let uploadDir = path.join(process.cwd(), 'uploads');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (e) {
    console.warn('Warning: Could not create uploads directory in CWD, falling back to /tmp/uploads for serverless environment.');
    uploadDir = '/tmp/uploads';
    if (!fs.existsSync(uploadDir)) {
        try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e2) {}
    }
}

// Configure multer for persistent uploads with file type restrictions
const upload = multer({ 
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado. Use PDF, DOC ou Imagens.'));
        }
    }
});

// VKX Pix Bridge Portal
router.get('/pix', (req, res) => {
    res.render('public/pix', { 
        title: 'VKX Pix — Portal Seguro',
        layout: false 
    });
});

// Download / Referral landing page
router.get('/download', (req, res) => {
    const ref = (req.query.ref as string) || req.cookies.vkx_ref || '';
    if (req.query.ref) {
        res.cookie('vkx_ref', req.query.ref, { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
    }

    const host = (
        (req.headers['x-forwarded-host'] as string) || 
        req.hostname || 
        req.headers.host || 
        ''
    ).toLowerCase();

    // If on main domain, redirect to wallet/download if possible or just home
    if (!host.includes('app.') && !host.includes('wallet.') && !host.includes('vercel.app')) {
        // Special case: do not redirect .well-known if we ever hit this, though this route is /download
        return res.redirect(`https://wallet.vkxtech.com.br/download?ref=${ref}`);
    }

    res.render('public/wallet/download', { 
        title: 'VKX Wallet — Download',
        layout: false,
        ref: ref,
        lang: res.locals.lang || 'pt',
        t: res.locals.t
    });
});

// Wildcard referral route as requested (wallet.vkxtech.com.br/ref_code)
router.get('/ref/:code', (req, res) => {
    const { code } = req.params;
    res.cookie('vkx_ref', code, { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
    res.redirect(`/download?ref=${code}`);
});

// Ensure .well-known files are served with correct Content-Type
router.get('/.well-known/apple-app-site-association', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.resolve(process.cwd(), 'public/.well-known/apple-app-site-association'));
});

router.get('/.well-known/assetlinks.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.resolve(process.cwd(), 'public/.well-known/assetlinks.json'));
});

router.get('/', async (req, res) => {
    const host = (
        (req.headers['x-forwarded-host'] as string) || 
        req.hostname || 
        req.headers.host || 
        ''
    ).toLowerCase();

    if (host.includes('app.')) {
        const headersToRemove = [
            'X-Frame-Options', 'Origin-Agent-Cluster', 'Referrer-Policy',
            'X-Content-Type-Options', 'X-Dns-Prefetch-Control', 'X-Download-Options',
            'X-Permitted-Cross-Domain-Policies', 'X-Xss-Protection',
            'Content-Security-Policy', 'Cross-Origin-Opener-Policy',
            'Cross-Origin-Resource-Policy', 'Cross-Origin-Embedder-Policy',
        ];
        for (const h of headersToRemove) res.removeHeader(h);

        res.set({
            'Content-Security-Policy': 'frame-ancestors *;',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Opener-Policy': 'unsafe-none',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        });

        return res.sendFile(path.resolve(process.cwd(), 'public/app/index.html'));
    }

    const refQuery = typeof req.query.ref === 'string' ? req.query.ref : '';
    const ref = refQuery || req.cookies.vkx_ref || '';
    if (refQuery) {
        res.cookie('vkx_ref', refQuery, { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
    }

    if (host.includes('wallet.') || req.query.preview === 'wallet') {
        if (refQuery) {
            return res.redirect(`/download?ref=${encodeURIComponent(refQuery)}`);
        }
        return res.render('public/wallet/index', {
            title: 'VKX Wallet',
            ref: ref,
            layout: false,
            clarityProjectId: process.env.CLARITY_PROJECT_ID || '',
            metaPixelId: process.env.META_PIXEL_ID || ''
        });
    }

    if (host.startsWith('grant.')) {
        return res.render('public/notion-embed', { 
            title: 'Dossier - One Pager',
            notionUrl: 'https://vkxtech.notion.site/VKX-Wallet-Grant-One-Pager-2f796e311731806abf40ee4bb8ad6ebf',
            layout: false 
        });
    }

    if (host.startsWith('pitch.')) {
        return res.render('public/notion-embed', { 
            title: 'Strategic Pitch Deck',
            notionUrl: 'https://vkxtech.notion.site/2f796e311731809e9f58f96507a626a9',
            layout: false 
        });
    }

    if (host.startsWith('answers.')) {
        return res.render('public/notion-embed', { 
            title: 'Application Questions & Answers',
            notionUrl: 'https://vkxtech.notion.site/2f796e3117318014b845fdbc3a06816f',
            layout: false 
        });
    }

    const stats = {
        negocios: "+100",
        projetos: "+30",
        operacoes: "R$ 2M+"
    };
    res.render('public/home', { title: 'Desenvolvimento de Sites, Apps e Sistemas', stats });
});

router.get('/charge', (req, res) => {
    const siteUrl = (process.env.SITE_URL || 'https://www.vkxtech.com.br').replace(/\/$/, '');

    res.render('public/charge', {
        title: 'VKX Charge',
        layout: false,
        submitted: req.query.submitted === '1',
        formError: typeof req.query.error === 'string' ? req.query.error : '',
        seo: {
            title: 'VKX Charge | Sistema de recarga elétrica para hotéis e estacionamentos',
            description: 'Transforme vagas em pontos de recarga para veículos elétricos com QR Code, pagamento Pix, painel de gestão e relatórios. Solução para hotéis, estacionamentos e condomínios.',
            keywords: 'recarga elétrica, carregador carro elétrico, eletroposto para hotel, carregador para estacionamento, sistema de recarga elétrica, gestão de carregadores, VKX Charge, mobilidade elétrica',
            url: `${siteUrl}/charge`,
            image: `${siteUrl}/og-main.png`
        }
    });
});

router.get('/seguranca', (req, res) => {
    const host = (req.headers.host || '').toLowerCase();
    const queryStr = req.url.split('?')[1] ? `?${req.url.split('?')[1]}` : '';
    if (host.includes('wallet.') || req.query.preview === 'wallet') {
        return res.redirect(`/${queryStr}#vault`);
    }
    const siteUrl = process.env.SITE_URL || 'https://wallet.vkxtech.com.br';
    const cleanUrl = siteUrl.replace(/\/$/, '');
    res.redirect(`${cleanUrl}/${queryStr}#vault`);
});

router.get('/gas-bnb', (req, res) => {
    const host = (req.headers.host || '').toLowerCase();
    const queryStr = req.url.split('?')[1] ? `?${req.url.split('?')[1]}` : '';
    if (host.includes('wallet.') || req.query.preview === 'wallet') {
        return res.redirect(`/${queryStr}#gas-shield`);
    }
    const siteUrl = process.env.SITE_URL || 'https://wallet.vkxtech.com.br';
    const cleanUrl = siteUrl.replace(/\/$/, '');
    res.redirect(`${cleanUrl}/${queryStr}#gas-shield`);
});

router.get('/usdt-multichain', (req, res) => {
    const host = (req.headers.host || '').toLowerCase();
    const queryStr = req.url.split('?')[1] ? `?${req.url.split('?')[1]}` : '';
    if (host.includes('wallet.') || req.query.preview === 'wallet') {
        return res.redirect(`/${queryStr}#multichain`);
    }
    const siteUrl = process.env.SITE_URL || 'https://wallet.vkxtech.com.br';
    const cleanUrl = siteUrl.replace(/\/$/, '');
    res.redirect(`${cleanUrl}/${queryStr}#multichain`);
});

router.get('/wallet-privacy', (req, res) => {
    res.render('public/wallet/privacy-policy', { title: 'Privacy Policy - VKX Wallet', layout: false });
});

router.get('/wallet-support', (req, res) => {
    res.render('public/wallet/support', { title: 'Support - VKX Wallet', layout: false });
});

router.get('/health', (req, res) => {
    res.status(200).send('ok');
});

router.get('/legal/privacy', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.') || host.startsWith('wallet.')) {
        return res.render('public/wallet/privacy-policy', { title: 'Privacy Policy - VKX Wallet', layout: false });
    }
    res.render('public/legal/privacy', { title: 'Política de Privacidade' });
});

router.get('/legal/terms', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.') || host.startsWith('wallet.')) {
        // App/Wallet terms if needed, otherwise fallback
        return res.render('public/legal/terms', { title: 'Terms of Use', layout: false });
    }
    res.render('public/legal/terms', { title: 'Termos de Uso' });
});

router.get('/legal/lgpd', (req, res) => {
    res.render('public/legal/lgpd', { title: 'Compliance LGPD' });
});

router.get('/privacy-policy', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.')) {
        return res.sendFile(path.resolve(process.cwd(), 'public/app/privacy.html'));
    }
    res.redirect('/legal/privacy');
});

router.get('/terms-of-use', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.')) {
        return res.sendFile(path.resolve(process.cwd(), 'public/app/terms.html'));
    }
    res.redirect('/legal/terms');
});

router.get('/terms', (req, res) => res.redirect('/legal/terms'));


router.get('/support', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.') || host.startsWith('wallet.')) {
         return res.render('public/wallet/support', { title: 'Support - VKX Wallet', layout: false });
    }
    res.render('public/support', { title: 'Modalidades de Suporte' });
});

router.get('/grant', (req, res) => res.render('public/notion-embed', { title: 'Dossier - One Pager', notionUrl: 'https://vkxtech.notion.site/VKX-Wallet-Grant-One-Pager-2f796e311731806abf40ee4bb8ad6ebf', layout: false }));
router.get('/pitch', (req, res) => res.render('public/notion-embed', { title: 'Strategic Pitch Deck', notionUrl: 'https://vkxtech.notion.site/2f796e311731809e9f58f96507a626a9', layout: false }));
router.get('/answers', (req, res) => res.render('public/notion-embed', { title: 'Application Questions & Answers', notionUrl: 'https://vkxtech.notion.site/2f796e3117318014b845fdbc3a06816f', layout: false }));

router.get('/services', (req, res) => res.render('public/services', { title: 'Soluções Corporativas' }));
router.get('/company', (req, res) => res.render('public/company', { title: 'A Empresa' }));
router.get('/portfolio', (req, res) => res.render('public/portfolio', { title: 'Portfólio de Projetos Digitais' }));
router.get('/wallet', (req, res) => res.redirect('https://wallet.vkxtech.com.br'));
router.get('/wallet-portal', (req, res) => res.render('public/wallet/index', { title: 'VKX Wallet', ref: '', layout: false, clarityProjectId: process.env.CLARITY_PROJECT_ID || '', metaPixelId: process.env.META_PIXEL_ID || '' }));
router.get('/security-architecture', (req, res) => res.render('public/security-architecture', { title: 'Security Architecture - VKX Wallet' }));
router.get('/group', (req, res) => res.render('public/group', { title: 'Grupo VKX' }));
router.get('/cases', (req, res) => res.render('public/cases', { title: 'Casos de Sucesso' }));
router.get('/request', (req, res) => res.render('public/request', { title: 'Fazer Pedido' }));
router.get('/contact', (req, res) => res.render('public/contact', { title: 'Contato' }));

router.get('/waas', (req, res) => {
    const siteUrl = (process.env.SITE_URL || 'https://www.vkxtech.com.br').replace(/\/$/, '');
    res.render('public/waas', {
        title: 'VKX WaaS — API Gasless e Integração',
        layout: false,
        seo: {
            title: 'VKX WaaS — API Gasless | Integração Zero-Trust via API REST',
            description: 'Infraestrutura non-custodial para criar smart wallets, patrocinar gás (BNB) e executar operações onchain com autenticação EIP-191, HMAC-SHA256 e arquitetura zero-trust. Taxa mínima de 0.10%.',
            url: `${siteUrl}/waas`
        }
    });
});

router.get('/integrar-api', (req, res) => {
    res.redirect('/waas');
});

router.get('/builder', (req, res) => {
    res.render('public/builder', { 
        title: 'Private Equity Venture Builder',
        layout: false 
    });
});

router.post('/builder', (req, res) => {
    upload.array('documents', 10)(req, res, async (err) => {
        if (err instanceof multer.MulterError || err) {
            console.error('File upload error:', err);
            return res.status(400).json({ 
                success: false, 
                error: err instanceof multer.MulterError ? 'Arquivo muito grande ou formato inválido.' : err.message || 'Erro ao processar o arquivo.' 
            });
        }

        try {
            const schema = z.object({
                name: z.string().min(2, "Nome muito curto"),
                email: z.string().email("E-mail inválido"),
                phone: z.string().min(8, "Telefone muito curto"),
                idea: z.string().min(5, "Ideia muito curta (mínimo 5 caracteres)"),
                problem: z.string().min(5, "Problema muito curto (mínimo 5 caracteres)"),
                investmentAmount: z.string().min(1, "Valor de investimento é obrigatório"),
                otherInfo: z.string().optional()
            });

            const parseResult = schema.safeParse(req.body);
            if (!parseResult.success) {
                const errorMsg = parseResult.error.issues.map(i => i.message).join(', ');
                return res.status(400).json({ success: false, error: `Dados inválidos: ${errorMsg}` });
            }

            const data = parseResult.data;
            const files = req.files as Express.Multer.File[];

            let lead = await prisma.lead.findUnique({ where: { email: data.email } });
            
            if (!lead) {
                lead = await prisma.lead.create({
                    data: {
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        personType: 'PF',
                        need: data.idea,
                        status: 'Novo',
                        score: 10,
                        consent: true,
                        consentAt: new Date(),
                        consentIp: req.ip
                    }
                });
            } else {
                lead = await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        phone: data.phone,
                        score: Math.max(lead.score, 10),
                        need: data.idea
                    }
                });
            }

            await prisma.builderApplication.create({
                data: {
                    leadId: lead.id,
                    idea: data.idea,
                    problem: data.problem,
                    investmentAmount: data.investmentAmount,
                    otherInfo: data.otherInfo,
                    documentPaths: files ? files.map(f => f.path) : []
                }
            });

            // Send notification to admin
            await MailService.sendAdminNotification('BUILDER', { 
                ...data, 
                email: lead.email,
                attachmentsCount: files?.length || 0
            });

            res.json({ success: true, message: 'Aplicação enviada com sucesso!' });
        } catch (err: any) {
            console.error('Builder application error:', err);
            res.status(500).json({ 
                success: false, 
                error: `Erro interno: ${err.message || 'Erro desconhecido'}` 
            });
        }
    });
});

router.post('/charge/lead', async (req, res) => {
    const wantsHtml = req.accepts(['html', 'json']) === 'html' && !(req.headers['content-type'] || '').includes('application/json');

    try {
        const data = chargeLeadSchema.parse(req.body);

        await MailService.sendChargeLeadNotification(data);

        if (wantsHtml) {
            return res.redirect('/charge?submitted=1#demonstracao');
        }

        return res.json({
            success: true,
            message: 'Solicitação recebida. Nossa equipe vai avaliar o potencial do local e entrar em contato.'
        });
    } catch (err: any) {
        console.error('Charge lead submission error:', err);

        const message = err instanceof z.ZodError
            ? err.issues.map((issue) => issue.message).join(' ')
            : 'Não foi possível enviar sua solicitação no momento.';

        if (wantsHtml) {
            return res.redirect(`/charge?error=${encodeURIComponent(message)}#demonstracao`);
        }

        return res.status(err instanceof z.ZodError ? 400 : 500).json({
            success: false,
            message
        });
    }
});

router.post('/request', async (req, res) => {
    try {
        const schema = z.object({
            name: z.string().min(2, "Nome muito curto"),
            email: z.string().email("E-mail inválido"),
            phone: z.string().min(8, "Telefone muito curto"),
            personType: z.enum(['PF', 'PJ']),
            companyName: z.string().optional(),
            website: z.string().optional(),
            message: z.string().min(5, "Mensagem muito curta"),
            projectType: z.string(),
            investmentRange: z.string(),
            consent: z.string().optional()
        });

        const parseResult = schema.safeParse(req.body);
        if (!parseResult.success) {
            const errorMsg = parseResult.error.issues.map(i => i.message).join(', ');
            return res.status(400).send(`Dados inválidos: ${errorMsg}`);
        }

        const data = parseResult.data;

        let score = 5; 
        if (data.projectType.includes('App') || data.projectType.includes('Sistema')) {
            score = 10;
        } else if (data.investmentRange === 'Até R$ 5.000' || data.investmentRange === 'Ate R$ 5.000') {
            score = 1;
        }

        let lead = await prisma.lead.findUnique({ where: { email: data.email } });
        
        if (!lead) {
            lead = await prisma.lead.create({
                data: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    personType: data.personType,
                    companyName: data.companyName,
                    website: data.website,
                    need: data.message,
                    consent: data.consent === 'on',
                    consentIp: req.ip,
                    consentAt: new Date(),
                    score: score,
                    status: 'Novo'
                }
            });
        } else {
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    score: Math.max(lead.score, score),
                    phone: data.phone,
                    need: data.message,
                    companyName: data.companyName || lead.companyName,
                    website: data.website || lead.website
                }
            });
        }

        await prisma.request.create({
            data: {
                leadId: lead.id,
                projectType: data.projectType,
                investmentRange: data.investmentRange,
                message: data.message
            }
        });

        // Send notification to admin
        await MailService.sendAdminNotification('REQUEST', { ...data, email: lead.email });

        res.render('public/request-success', { 
            title: 'Solicitação Recebida',
            lead, 
            data 
        });
    } catch (err: any) {
        console.error('Request submission CRITICAL error:', err);
        res.status(500).send(`Erro interno (DEBUG): ${err.message || 'Desconhecido'}`);
    }
});

router.post('/contact', async (req, res) => {
    try {
        const schema = z.object({
            name: z.string().min(2, "Nome muito curto"),
            email: z.string().email("E-mail inválido"),
            phone: z.string().min(8, "Telefone muito curto"),
            message: z.string().min(5, "Mensagem muito curta")
        });

        const data = schema.parse(req.body);

        let lead = await prisma.lead.findUnique({ where: { email: data.email } });
        
        if (!lead) {
            lead = await prisma.lead.create({
                data: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    personType: 'PF',
                    need: data.message,
                    status: 'Novo',
                    score: 5
                }
            });
        } else {
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    need: data.message,
                    phone: data.phone
                }
            });
        }

        res.render('public/request-success', { lead, data: { ...data, projectType: 'Contato Geral', investmentRange: 'N/A' } });
    } catch (err: any) {
        console.error('Contact submission error:', err);
        if (err instanceof z.ZodError) {
            const errorMsg = err.issues.map((e: any) => e.message).join(', ');
            return res.status(400).send(`Dados inválidos: ${errorMsg}`);
        }
        res.status(500).send('Erro interno ao processar seu contato.');
    }
});

router.get('/pay/:token', async (req, res) => {
    const { token } = req.params;
    const invoice = await prisma.invoice.findUnique({
        where: { token },
        include: { lead: true }
    });
    if (!invoice) return res.status(404).send('Link de pagamento inválido');
    res.render('public/pay', { title: 'Pagamento', invoice, layout: 'layouts/payment' });
});

router.get('/unsubscribe', async (req, res) => {
    const { token } = req.query;
    if (token) {
        const unsub = await prisma.unsubscribe.findUnique({ where: { token: String(token) } });
        if (unsub) {
            await prisma.lead.updateMany({
                where: { email: unsub.email },
                data: { consent: false }
            });
            return res.render('public/unsubscribe-success');
        }
    }
    res.status(400).send('Link inválido');
});

// Growth Autopilot Blog Engine Implementation

async function detectProjectSlug(req: any): Promise<string> {
    const host = ((req.headers['x-forwarded-host'] as string) || req.hostname || req.headers.host || '').toLowerCase();
    
    try {
        const projects = await prisma.growthProject.findMany({
            select: { slug: true, domain: true }
        });
        
        for (const p of projects) {
            if (p.domain && (host === p.domain.toLowerCase() || host.endsWith('.' + p.domain.toLowerCase()) || host.includes(p.domain.toLowerCase()))) {
                return p.slug;
            }
        }
    } catch (e) {
        console.error('[detectProjectSlug] Database domain lookup failed:', e);
    }
    
    if (host.includes('wallet') || host.includes('app.')) {
        return 'vkx-wallet';
    }
    if (host.includes('vkinha')) {
        return 'vkinha-token';
    }
    if (host.includes('sovereign')) {
        return 'sovereign-game';
    }
    if (host.includes('vkxtech') || host.includes('tech.')) {
        return 'vkx-tech';
    }
    
    if (req.query.project) {
        return req.query.project as string;
    }
    
    return 'vkx-tech';
}

function parseMarkdownToHtml(markdown: string): string {
    if (!markdown) return '';
    let html = markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/^### (.*?)$/gm, '<h3 class="text-xl font-bold text-white mt-6 mb-3 font-outfit">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-bold text-white mt-8 mb-4 font-outfit border-b border-white/5 pb-2">$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1 class="text-3xl font-black text-white mt-10 mb-6 font-outfit">$1</h1>')
        .replace(/^\- (.*?)$/gm, '<li class="ml-4 list-disc text-white/70 my-1">$1</li>')
        .replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc text-white/70 my-1">$1</li>')
        .replace(/\n\n/g, '</p><p class="text-white/75 leading-relaxed my-4">');

    html = html.replace(/(<li.*?>.*?<\/li>)/gs, '<ul class="my-4">$1</ul>');
    html = html.replace(/<\/ul>\s*<ul class="my-4">/g, '');

    return `<p class="text-white/75 leading-relaxed my-4">${html}</p>`;
}

router.get('/blog', async (req, res) => {
    try {
        const slug = await detectProjectSlug(req);
        const project = await prisma.growthProject.findUnique({ where: { slug } });
        if (!project) return res.status(404).send('Blog não encontrado.');

        const articles = await prisma.publishedArticle.findMany({
            where: { projectSlug: slug },
            orderBy: { publishedAt: 'desc' }
        });

        res.render('public/blog/list', {
            title: `Blog Oficial — ${project.name}`,
            layout: false,
            project,
            articles
        });
    } catch (err: any) {
        console.error('Error fetching blog list:', err);
        res.status(500).send('Erro ao carregar o blog.');
    }
});

router.get('/blog/:slug', async (req, res) => {
    try {
        const projectSlug = await detectProjectSlug(req);
        const project = await prisma.growthProject.findUnique({ where: { slug: projectSlug } });
        if (!project) return res.status(404).send('Blog não encontrado.');

        const article = await prisma.publishedArticle.findUnique({
            where: {
                projectSlug_slug: {
                    projectSlug,
                    slug: req.params.slug
                }
            }
        });

        if (!article) return res.status(404).send('Artigo não encontrado.');

        const bodyHtml = parseMarkdownToHtml(article.markdown);

        res.render('public/blog/detail', {
            title: article.metaTitle || article.title,
            layout: false,
            project,
            article,
            bodyHtml
        });
    } catch (err: any) {
        console.error('Error fetching blog post:', err);
        res.status(500).send('Erro ao carregar o artigo.');
    }
});

router.get('/robots.txt', async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`);
});

router.get('/sitemap.xml', async (req, res) => {
    try {
        const slug = await detectProjectSlug(req);
        const articles = await prisma.publishedArticle.findMany({
            where: { projectSlug: slug },
            orderBy: { publishedAt: 'desc' }
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  ${articles.map(art => `
  <url>
    <loc>${baseUrl}/blog/${art.slug}</loc>
    <lastmod>${art.publishedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  `).join('')}
</urlset>`;

        res.setHeader('Content-Type', 'application/xml');
        res.send(xml.trim());
    } catch (err) {
        res.status(500).send('Erro ao gerar sitemap.');
    }
});

const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com', 'dispostable.com', 
    '10minutemail.com', 'sharklasers.com', 'getairmail.com', 'throwawaymail.com', 'temp-mail.org'
];

router.post('/newsletter/subscribe', newsletterLimiter, async (req, res) => {
    try {
        const schema = z.object({
            email: z.string().email("E-mail inválido"),
            updates: z.array(z.string()).optional(),
            utm_source: z.string().optional(),
            utm_medium: z.string().optional(),
            utm_campaign: z.string().optional(),
            utm_content: z.string().optional(),
            ref: z.string().optional()
        });
        const data = schema.parse(req.body);

        // Disposable Domain Rejection
        const emailDomain = data.email.split('@')[1]?.toLowerCase();
        if (emailDomain && DISPOSABLE_DOMAINS.includes(emailDomain)) {
            return res.status(400).json({ success: false, error: 'Provedor de e-mail temporário ou descartável não permitido.' });
        }

        const formattedNotes = `Ref: ${data.ref || 'Direct'}\nUTM Source: ${data.utm_source || ''}\nUTM Medium: ${data.utm_medium || ''}\nUTM Campaign: ${data.utm_campaign || ''}\nUTM Content: ${data.utm_content || ''}`;
        
        let lead = await prisma.lead.findUnique({ where: { email: data.email } });
        if (!lead) {
            await prisma.lead.create({
                data: {
                    name: 'Newsletter Subscriber',
                    email: data.email,
                    phone: '',
                    personType: 'PF',
                    need: `Newsletter Subscription: ${data.updates?.join(', ') || 'General'}`,
                    notes: formattedNotes,
                    status: 'Novo',
                    score: 1
                }
            });
        } else {
            // Update the lead's description and append the new notes
            await prisma.lead.update({
                where: { email: data.email },
                data: {
                    need: `${lead.need || ''} | Subscribed to updates: ${data.updates?.join(', ') || 'General'}`,
                    notes: `${lead.notes || ''}\n\n[New Subscription]\n${formattedNotes}`
                }
            });
        }
        res.json({ success: true, message: 'Inscrição realizada com sucesso!' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message || 'Erro ao processar.' });
    }
});

export default router;
