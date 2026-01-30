import { Router } from 'express';
import { prisma } from '../server.js';
import { z } from 'zod';

const router = Router();

import path from 'path';

router.get('/', async (req, res) => {
    // Pegar o host de todas as fontes possíveis para garantir detecção na Vercel
    const host = (
        (req.headers['x-forwarded-host'] as string) || 
        req.hostname || 
        req.headers.host || 
        ''
    ).toLowerCase();

    // 1. PÁGINA BRANCA/VERDE (ESTÁTICA PARA LINEA)
    // Procuramos especificamente pelo subdomínio "app."
    if (host.includes('app.')) {
        // Remover TODOS os headers de segurança do Helmet que bloqueiam iframe
        const headersToRemove = [
            'X-Frame-Options', 'Origin-Agent-Cluster', 'Referrer-Policy',
            'X-Content-Type-Options', 'X-Dns-Prefetch-Control', 'X-Download-Options',
            'X-Permitted-Cross-Domain-Policies', 'X-Xss-Protection',
            'Content-Security-Policy', 'Cross-Origin-Opener-Policy',
            'Cross-Origin-Resource-Policy', 'Cross-Origin-Embedder-Policy',
        ];
        for (const h of headersToRemove) res.removeHeader(h);

        // Headers permissivos para iframe embedding (Linea Dev / qualquer origem)
        res.set({
            'Content-Security-Policy': 'frame-ancestors *;',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Opener-Policy': 'unsafe-none',
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        });

        if (req.path === '/privacy-policy') {
            return res.sendFile(path.resolve(process.cwd(), 'public/app/privacy.html'));
        }
        if (req.path === '/terms-of-use') {
            return res.sendFile(path.resolve(process.cwd(), 'public/app/terms.html'));
        }
        return res.sendFile(path.resolve(process.cwd(), 'public/app/index.html'));
    }

    // 2. PÁGINA ESCURA (EJS - INSTITUCIONAL)
    // Procuramos pelo subdomínio "wallet."
    if (host.includes('wallet.')) {
        return res.render('public/wallet', { 
            title: 'VKX Wallet - Institutional Portal',
            layout: false 
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

    // Fluxo Padrão (Somente aqui ele toca no banco se necessário)
    const stats = {
        negocios: "+100",
        projetos: "+30",
        operacoes: "R$ 2M+"
    };
    res.render('public/home', { title: 'Destaque em Tecnologia', stats });
});

// Wallet specific routes (accessible via path or app. subdomain handled above)
router.get('/wallet-privacy', (req, res) => {
    res.render('public/wallet/privacy-policy', { title: 'Privacy Policy - VKX Wallet', layout: false });
});

router.get('/wallet-support', (req, res) => {
    res.render('public/wallet/support', { title: 'Support - VKX Wallet', layout: false });
});

router.get('/health', (req, res) => {
    res.status(200).send('ok');
});

// Alias for common paths if needed on the app subdomain
router.get('/privacy-policy', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.') || host.startsWith('wallet.')) {
        return res.render('public/wallet/privacy-policy', { title: 'Privacy Policy - VKX Wallet', layout: false });
    }
    // Fallback to group privacy if not on app subdomain
    res.render('public/legal/privacy', { title: 'Política de Privacidade' });
});

router.get('/support', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.') || host.startsWith('wallet.')) {
         return res.render('public/wallet/support', { title: 'Support - VKX Wallet', layout: false });
    }
    res.render('public/contact', { title: 'Contato' });
});

router.get('/wallet', (req, res) => {
    res.render('public/wallet', { title: 'VKX Wallet - Non-Custodial Multichain Wallet' });
});

// Mantemos as rotas de path fixo apenas para compatibilidade ou acesso direto
router.get('/grant', (req, res) => res.render('public/notion-embed', { title: 'Dossier - One Pager', notionUrl: 'https://vkxtech.notion.site/VKX-Wallet-Grant-One-Pager-2f796e311731806abf40ee4bb8ad6ebf', layout: false }));
router.get('/pitch', (req, res) => res.render('public/notion-embed', { title: 'Strategic Pitch Deck', notionUrl: 'https://vkxtech.notion.site/2f796e311731809e9f58f96507a626a9', layout: false }));
router.get('/answers', (req, res) => res.render('public/notion-embed', { title: 'Application Questions & Answers', notionUrl: 'https://vkxtech.notion.site/2f796e3117318014b845fdbc3a06816f', layout: false }));

router.get('/services', (req, res) => {
    res.render('public/services', { title: 'Soluções Corporativas' });
});

router.get('/company', (req, res) => {
    res.render('public/company', { title: 'A Empresa' });
});

router.get('/portfolio', (req, res) => {
    res.render('public/portfolio', { title: 'Portfólio Técnico' });
});

router.get('/legal/lgpd', (req, res) => {
    res.render('public/legal/lgpd', { title: 'Privacidade e LGPD' });
});

router.get('/legal/privacy', (req, res) => {
    res.render('public/legal/privacy', { title: 'Política de Privacidade' });
});

router.get('/legal/terms', (req, res) => {
    res.render('public/legal/terms', { title: 'Termos de Uso' });
});

router.get('/group', (req, res) => {
    res.render('public/group', { title: 'Grupo VKX' });
});

router.get('/cases', (req, res) => {
    res.render('public/cases', { title: 'Casos de Sucesso' });
});

router.get('/request', (req, res) => {
    res.render('public/request', { title: 'Fazer Pedido' });
});

router.post('/request', async (req, res) => {
    try {
        const schema = z.object({
            name: z.string().min(2),
            email: z.string().email(),
            phone: z.string().min(8),
            personType: z.enum(['PF', 'PJ']),
            companyName: z.string().optional(),
            website: z.string().optional(),
            message: z.string().min(5),
            projectType: z.string(),
            investmentRange: z.string(),
            consent: z.string().optional()
        });

        const data = schema.parse(req.body);

        // Scoring Logic
        let score = 5; // Default Medium
        if (data.projectType.includes('App') || data.projectType.includes('Sistema')) {
            score = 10;
        } else if (data.investmentRange === 'Até R$ 5.000') {
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
            // Update existing lead score and details
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    score: Math.max(lead.score, score),
                    phone: data.phone,
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

        res.render('public/request-success', { lead, data });
    } catch (err) {
        console.error(err);
        res.status(400).send('Dados inválidos ou incompletos.');
    }
});

router.get('/contact', (req, res) => {
    res.render('public/contact', { title: 'Contato' });
});

router.get('/payment', (req, res) => {
    res.render('public/payment-info', { title: 'Pagamento' });
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

router.get('/legal/privacy', (req, res) => res.render('public/legal', { type: 'privacy' }));
router.get('/legal/terms', (req, res) => res.render('public/legal', { type: 'terms' }));

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

export default router;
