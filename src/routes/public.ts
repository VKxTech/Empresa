import { Router } from 'express';
import { MailService } from '../services/mail.js';
import { prisma } from '../server.js';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { rateLimit } from 'express-rate-limit';
import { siteOrigin } from '../lib/site.js';
import { serializeJsonLd } from '../lib/safeJson.js';
import { renderArticleMarkdown } from '../lib/markdown.js';
import { buildArticleSeo } from '../lib/articleSeo.js';
import { serviceDocs } from '../content/serviceDocs.js';

const newsletterLimiter = (rateLimit as any)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { success: false, error: 'Muitas inscrições vindas deste IP. Tente novamente mais tarde.' }
});

const router = Router();

// Painel autenticado e embed nao sao conteudo de busca: eles usam
// layout:false, entao nao passam pelo head.ejs e ficariam sem canonical
// nem OpenGraph. Marcar noindex e mais correto que inventar canonical.
function noIndex(_req: any, res: any, next: any) {
    res.set('X-Robots-Tag', 'noindex, follow');
    next();
}

// Layout imersivo (dark + GSAP) usado pelas páginas institucionais.
const IMMERSIVE_LAYOUT = 'layouts/immersive';

// Auto-sync transak.mp4 to public folder if present in Downloads
try {
    const srcVideo = 'C:\\Users\\feeli\\Downloads\\transak.mp4';
    const destVideo1 = path.resolve(process.cwd(), 'public/transak.mp4');
    const destVideo2 = path.resolve(process.cwd(), 'public/app/transak.mp4');
    if (fs.existsSync(srcVideo)) {
        if (!fs.existsSync(destVideo1) || fs.statSync(destVideo1).size !== fs.statSync(srcVideo).size) {
            fs.copyFileSync(srcVideo, destVideo1);
            console.log('[VKX] Successfully copied transak.mp4 to public/transak.mp4');
        }
        if (fs.existsSync(path.dirname(destVideo2)) && (!fs.existsSync(destVideo2) || fs.statSync(destVideo2).size !== fs.statSync(srcVideo).size)) {
            fs.copyFileSync(srcVideo, destVideo2);
            console.log('[VKX] Successfully copied transak.mp4 to public/app/transak.mp4');
        }
    }
} catch (e) {
    // Silent catch if on non-local environment
}

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

// VKX Pix saiu da arquitetura de produtos (pagamentos em moeda fiduciária passaram
// a ser feitos por terceiros). A página foi removida: manter no ar apresentaria
// um produto inexistente. 301 permanente para a VKX Wallet, que é o produto de
// movimentação de valor que continua existindo.
router.get('/pix', (_req, res) => {
    res.redirect(301, 'https://wallet.vkxtech.com.br');
});

// A rota real sempre foi /contact. `/contato` (português) nunca existiu e
// devolvia 404 — e era o valor de `primaryCtaUrl` do projeto vkx-tech, ou seja,
// o CTA que o Growth Engine usaria. Redirect para não deixar link morto, aqui
// ou em qualquer material antigo que já tenha saído com esse endereço.
router.get('/contato', (_req, res) => {
    res.redirect(301, '/contact');
});

// Arquivo de verificação do IndexNow. O protocolo exige que <chave>.txt
// responda na raiz com a própria chave como conteúdo. A rota é registrada com
// caminho LITERAL e só quando a chave existe — sem INDEXNOW_KEY não há rota
// nenhuma, nada é inventado só para o endpoint existir.
const indexNowKey = String(process.env.INDEXNOW_KEY || '').trim();
if (/^[A-Za-z0-9-]{8,128}$/.test(indexNowKey)) {
    router.get(`/${indexNowKey}.txt`, (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(indexNowKey);
    });
}

// Download / Referral landing page
// Mesmo formato que o app aceita (referralCore.ts). Sem isto o `ref` ia cru
// para dentro de <script> na landing: `\\` ou `%0A` quebravam a copia, o
// beacon e o deep link, e a pagina anunciava "Bonus ativado" para um codigo
// que a API rejeita com 400.
const REF_CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;
const cleanRefCode = (value: unknown): string => {
    const raw = typeof value === 'string' ? value.trim() : '';
    return REF_CODE_RE.test(raw) ? raw : '';
};

router.get('/download', (req, res) => {
    const queryRef = cleanRefCode(req.query.ref);
    const ref = queryRef || cleanRefCode(req.cookies?.vkx_ref);
    if (queryRef) {
        res.cookie('vkx_ref', queryRef, { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
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
        // A atribuicao precisa atravessar o salto de subdominio: sem isso, a
        // Wallet recebe a visita sem saber de qual artigo ou campanha ela veio, e
        // o clique na loja fica orfao. `ref` continua sendo o codigo de indicacao,
        // que e outra coisa e segue intacto.
        const attr = new URLSearchParams();
        if (ref) attr.set('ref', String(ref));
        for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'src', 'content']) {
            const v = req.query[k];
            if (typeof v === 'string' && v) attr.set(k, v.slice(0, 120));
        }
        // Origem implicita: quem chegou de um artigo carrega o caminho de origem.
        if (!attr.has('src') && typeof req.get('referer') === 'string') {
            try {
                const u = new URL(req.get('referer') as string);
                if (u.hostname.endsWith('vkxtech.com.br') && u.pathname.startsWith('/blog/')) {
                    attr.set('src', 'blog');
                    attr.set('content', u.pathname.replace('/blog/', '').slice(0, 120));
                }
            } catch (e) { /* referer invalido: segue sem origem */ }
        }
        return res.redirect(`https://wallet.vkxtech.com.br/download?${attr.toString()}`);
    }

    // Atribuicao que vai DENTRO do parametro `referrer` do link da Play
    // Store. Este e o unico canal oficial que liga uma instalacao a campanha
    // que a gerou; sem isso o clique na loja fica orfao e a cadeia de
    // aquisicao termina um metro antes do fim.
    const atribuicaoLoja = new URLSearchParams();
    if (ref) atribuicaoLoja.set('ref', String(ref));
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'src', 'content']) {
        const v = req.query[k];
        // Truncado: a string do Install Referrer tem limite pratico de tamanho.
        if (typeof v === 'string' && v) atribuicaoLoja.set(k, v.slice(0, 80));
    }

    res.render('public/wallet/download', { 
        title: 'VKX Wallet — Download',
        layout: false,
        ref: ref,
        atribuicaoLoja: atribuicaoLoja.toString(),
        lang: res.locals.lang,
        t: res.locals.t
    });
});

// Wildcard referral route as requested (wallet.vkxtech.com.br/ref_code)
router.get('/ref/:code', (req, res) => {
    const code = cleanRefCode(req.params.code);
    if (!code) return res.redirect('/download');
    res.cookie('vkx_ref', code, { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
    res.redirect(`/download?ref=${encodeURIComponent(code)}`);
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

    if (host.includes('empresa.')) {
        return res.redirect('/admin/planner');
    }

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
    res.render('public/home', { title: 'Desenvolvimento de Sites, Apps e Sistemas', stats, layout: IMMERSIVE_LAYOUT });
});

router.get('/charge', (req, res) => {
    const siteUrl = siteOrigin();

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

// Pagina publica de seguranca da wallet: modelo de ameaca, criptografia
// pos-quantica e canal de divulgacao responsavel. Rota /wallet-security no
// mesmo padrao das outras estaticas (layout: false, HTML completo no EJS).
router.get('/wallet-security', (req, res) => {
    res.render('public/wallet/security', { title: 'Security - VKX Wallet', layout: false });
});

// Versao em portugues da pagina de seguranca. Arquivo separado em vez de dois
// idiomas embutidos num template: documento legal muda pouco e assim cada
// versao fica legivel. As duas paginas se apontam por um seletor no topo.
router.get('/wallet-security-pt', (req, res) => {
    res.render('public/wallet/security-pt', { title: 'Segurança - VKX Wallet', layout: false });
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

router.get('/wallet/terms', (req, res) => {
    res.render('public/wallet/terms', { title: 'Terms of Service - VKX Wallet', layout: false });
});

router.get('/transak', (req, res) => {
    res.render('public/wallet/transak', { title: 'VKX Wallet — Transak Integration Demo', layout: false });
});

router.get('/wallet/transak', (req, res) => {
    res.render('public/wallet/transak', { title: 'VKX Wallet — Transak Integration Demo', layout: false });
});

router.get('/wallet-terms', (req, res) => {
    res.render('public/wallet/terms', { title: 'Terms of Service - VKX Wallet', layout: false });
});

router.get('/legal/terms', (req, res) => {
    const host = ((req.headers['x-forwarded-host'] as string) || req.hostname || req.headers.host || '').toLowerCase();
    if (host.includes('wallet.') || host.includes('app.') || req.query.product === 'wallet') {
        return res.render('public/wallet/terms', { title: 'Terms of Service - VKX Wallet', layout: false });
    }
    res.render('public/legal/terms', { title: 'Termos de Uso Corporativo' });
});

router.get('/legal/lgpd', (req, res) => {
    res.render('public/legal/lgpd', { title: 'Compliance LGPD' });
});

router.get('/privacy-policy', (req, res) => {
    const host = ((req.headers['x-forwarded-host'] as string) || req.hostname || req.headers.host || '').toLowerCase();
    if (host.includes('app.')) {
        return res.sendFile(path.resolve(process.cwd(), 'public/app/privacy.html'));
    }
    res.redirect('/legal/privacy');
});

router.get('/terms-of-use', (req, res) => {
    const host = ((req.headers['x-forwarded-host'] as string) || req.hostname || req.headers.host || '').toLowerCase();
    if (host.includes('wallet.') || req.query.product === 'wallet') {
        return res.render('public/wallet/terms', { title: 'Terms of Service - VKX Wallet', layout: false });
    }
    if (host.includes('app.')) {
        return res.sendFile(path.resolve(process.cwd(), 'public/app/terms.html'));
    }
    res.redirect('/legal/terms');
});

router.get('/terms', (req, res) => {
    const host = ((req.headers['x-forwarded-host'] as string) || req.hostname || req.headers.host || '').toLowerCase();
    if (host.includes('wallet.') || req.query.product === 'wallet') {
        return res.render('public/wallet/terms', { title: 'Terms of Service - VKX Wallet', layout: false });
    }
    res.redirect('/legal/terms');
});


router.get('/support', (req, res) => {
    const host = req.headers.host || '';
    if (host.startsWith('app.') || host.startsWith('wallet.')) {
         return res.render('public/wallet/support', { title: 'Support - VKX Wallet', layout: false });
    }
    res.render('public/support', { title: 'Modalidades de Suporte' });
});

router.get('/grant', (req, res) => res.render('public/notion-embed', { title: 'Dossier - One Pager', notionUrl: 'https://vkxtech.notion.site/VKX-Wallet-Grant-One-Pager-2f796e311731806abf40ee4bb8ad6ebf', layout: false }));
router.get('/pitch', (req, res) => res.render('public/notion-embed', { title: 'Strategic Pitch Deck', notionUrl: 'https://vkxtech.notion.site/2f796e311731809e9f58f96507a626a9', layout: false }));
router.get('/answers', noIndex, (req, res) => res.render('public/notion-embed', { title: 'Application Questions & Answers', notionUrl: 'https://vkxtech.notion.site/2f796e3117318014b845fdbc3a06816f', layout: false }));

// Deck para a Nexo Ventures (nexo.com/ventures). A candidatura aceita a URL do
// deck, então esta página É o deck; copy em inglês porque o leitor é o time da
// Nexo. Métricas, termos da rodada e equipe ficam neste objeto, não no
// template: campo null não é renderizado, para a página nunca mostrar um
// espaço em branco ao investidor. noIndex: material de captação não é
// conteúdo de busca (por isso também fica fora do sitemap).
router.get('/nexo', noIndex, (req, res) => {
    const deck = {
        // Só entra na página o que tiver `value`. Preencher conforme os números
        // reais: downloads acumulados, transações, volume on-chain e receita.
        traction: [
            { value: '800+', label: 'Active users', note: 'VKX Wallet on iOS and Android.' },
            { value: null, label: 'Downloads', note: 'App Store and Google Play, cumulative.' },
            { value: null, label: 'Transactions', note: 'Wallet, Pay, Bridge and Gas, cumulative.' },
            { value: null, label: 'On-chain volume', note: 'USD, trailing twelve months.' },
            { value: null, label: 'Revenue', note: 'Swap, Pay, Bridge, Gas and WaaS fees, trailing twelve months.' }
        ].filter((m) => m.value),
        // Ex.: stage 'Seed', size 'US$ 2M', valuation 'US$ 12M post-money',
        // committed 'US$ 500k soft-committed'. Tudo null = "shared on request".
        round: { stage: null, size: null, valuation: null, committed: null },
        // Ex.: { name: '...', role: 'Founder & CEO', bio: '...', linkedin: 'https://...' }
        team: [] as Array<{ name: string; role: string; bio: string; linkedin?: string }>
    };

    res.render('public/nexo', {
        title: 'VKX × Nexo Ventures',
        layout: IMMERSIVE_LAYOUT,
        deck,
        seo: {
            title: 'VKX Technologies × Nexo Ventures | Investor deck',
            description: 'The self-custodial financial infrastructure for Latin America: VKX Wallet, VKX Pay, Bridge, Gas Sponsorship and Wallet as a Service in one non-custodial stack. Deck prepared for Nexo Ventures.',
            keywords: 'VKX Technologies, Nexo Ventures, self-custodial wallet, Latin America, crypto payments, investor deck'
        }
    });
});

router.get('/services', (req, res) => res.render('public/services', { title: 'Soluções Corporativas', layout: IMMERSIVE_LAYOUT }));
router.get('/politica-editorial', (req, res) => res.render('public/politica-editorial', {
    title: 'Política editorial',
    // O objeto `seo` tem prioridade sobre o dicionario de traducao no head.
    // Sem ele, `pageKey` nao encontra esta rota e o title cai no default —
    // que e o mesmo da home, gerando TITLE DUPLICADO entre duas URLs.
    seo: {
        title: 'Política editorial | VKX Technologies',
        description: 'Como o conteúdo do blog da VKX é produzido, verificado e corrigido: exigência de fonte que sustente a afirmação, conferência de números e o que não fazemos.',
        canonical: 'https://vkxtech.com.br/politica-editorial',
    },
}));
router.get('/editorial-policy', (req, res) => res.redirect(301, '/politica-editorial'));
router.get('/sobre', (req, res) => res.redirect(301, '/company'));
router.get('/about', (req, res) => res.redirect(301, '/company'));
router.get('/company', (req, res) => res.render('public/company', { title: 'A Empresa', layout: IMMERSIVE_LAYOUT }));
router.get('/portfolio', (req, res) => res.render('public/portfolio', { title: 'Portfólio de Projetos Digitais', layout: IMMERSIVE_LAYOUT }));
router.get('/wallet', (req, res) => res.redirect('https://wallet.vkxtech.com.br'));
router.get('/wallet-portal', (req, res) => res.render('public/wallet/index', { title: 'VKX Wallet', ref: '', layout: false, clarityProjectId: process.env.CLARITY_PROJECT_ID || '', metaPixelId: process.env.META_PIXEL_ID || '' }));
router.get('/security-architecture', (req, res) => res.render('public/security-architecture', { title: 'Security Architecture - VKX Wallet' }));
// Sovereign World Order — simulador geopolítico para PC, produto próprio da
// VKX. Em desenvolvimento: alvo Steam 2027 e demo alpha planejada para o fim
// de 2026 (docs/ROADMAP_STEAM_2027 no repositório do jogo).
router.get('/sovereign', (req, res) => {
    const lang = res.locals.lang;
    // Sem `seo` explícito o head.ejs cai na chave 'home' e a página herdaria o
    // título e a descrição da home institucional.
    const seoByLang: Record<string, { title: string; description: string; keywords: string }> = {
        pt: {
            title: 'Sovereign World Order — jogo de estratégia geopolítica',
            description: 'Governe um país e veja os outros 195 reagirem. Economia, diplomacia e opinião pública em um jogo de estratégia para PC. Em breve na Steam.',
            keywords: 'jogo de estratégia, simulador geopolítico, jogo de país, estratégia PC, Steam, jogo de governo'
        },
        en: {
            title: 'Sovereign World Order — geopolitical strategy game',
            description: 'Run a country and watch the other 195 react. Economy, diplomacy and public opinion in a PC strategy game. Coming soon to Steam.',
            keywords: 'strategy game, geopolitical simulator, nation game, PC strategy, Steam, government game'
        },
        es: {
            title: 'Sovereign World Order — juego de estrategia geopolítica',
            description: 'Gobierna un país y observa cómo reaccionan los otros 195. Economía, diplomacia y opinión pública en un juego de estrategia para PC.',
            keywords: 'juego de estrategia, simulador geopolítico, juego de países, estrategia PC, Steam'
        },
        zh: {
            title: 'Sovereign World Order — 地缘政治策略游戏',
            description: '治理一个国家，看另外 195 个如何回应。经济、外交与民意，尽在这款 PC 策略游戏。即将登陆 Steam。',
            keywords: '策略游戏, 地缘政治模拟, 国家养成, PC 策略, Steam'
        },
        ar: {
            title: 'Sovereign World Order — لعبة استراتيجية جيوسياسية',
            description: 'احكم دولة وراقب تفاعل الـ195 الأخرى. اقتصاد ودبلوماسية ورأي عام في لعبة استراتيجية للحاسب. قريبًا على Steam.',
            keywords: 'لعبة استراتيجية, محاكاة جيوسياسية, لعبة دول, استراتيجية PC, Steam'
        }
    };
    const seo = seoByLang[lang] || seoByLang.en;

    // Antes/depois: mesma tela em junho e em agosto de 2026, para o visitante
    // ver que o projeto está em produção. Só entra o par cujos dois arquivos
    // existem — assim a página nunca mostra metade de uma comparação.
    const shotsDir = path.resolve(process.cwd(), 'public/img/sovereign');
    const has = (file: string) => fs.existsSync(path.join(shotsDir, `${file}.webp`));

    // As alturas variam porque as capturas de junho vieram de outro build; os
    // valores reais evitam o pulo de layout enquanto a imagem carrega.
    const PAIRS = [
        { before: 'jun-inicial', bh: 795, after: 'ago-inicial', ah: 774 },
        { before: 'jun-mapa', bh: 813, after: 'ago-mapa', ah: 774 }
    ];
    const pairs = PAIRS
        .map((pair, index) => ({ ...pair, index }))
        .filter((pair) => has(pair.before) && has(pair.after));

    // Telas que não existiam em junho.
    const NEWS = ['ago-ato1', 'ago-ato2', 'ago-ato3'];
    const news = NEWS
        .map((file, index) => ({ file, index }))
        .filter((item) => has(item.file));

    res.render('public/sovereign', {
        title: 'Sovereign World Order',
        layout: IMMERSIVE_LAYOUT,
        pairs,
        news,
        seo: { ...seo, image: `${siteOrigin()}/img/sovereign/ago-mapa.webp` }
    });
});

router.get('/group', (req, res) => res.render('public/group', { title: 'Grupo VKX' }));
router.get('/request', (req, res) => res.render('public/request', { title: 'Fazer Pedido', layout: IMMERSIVE_LAYOUT }));
router.get('/contact', (req, res) => res.render('public/contact', { title: 'Contato', layout: IMMERSIVE_LAYOUT }));

// Painel self-service da Bridge API: login Google, chave vkx_live_*, volume e
// tutorial de integração. Frontend puro — todo dado vem de api.vkxtech.com.br
// direto do browser (CORS já libera vkxtech.com.br), a Vercel não toca em DB.
// Locale BCP-47 por idioma: o painel formata valores e datas com ele, e o
// botão do Google usa o mesmo para renderizar no idioma da página.
const BRIDGE_LOCALES: Record<string, string> = {
    pt: 'pt-BR', en: 'en-US', es: 'es-ES', zh: 'zh-CN', ar: 'ar'
};

// Página de marketing/SEO da Bridge API. É a porta de entrada pública do
// produto: hero, rotas, preços, integração e FAQ, com i18n em 5 idiomas e
// dados estruturados (JSON-LD). O painel self-service saiu daqui para
// /bridge/painel — os CTAs desta página apontam para lá.
router.get('/bridge', (req, res) => {
    const siteUrl = siteOrigin();
    res.render('public/bridge', {
        title: 'VKX Bridge API — mova USDT entre redes com uma API',
        layout: false,
        siteUrl,
        // O host da API não aparece nesta página (os exemplos usam npm/@vkx/bridge),
        // mas é passado por consistência com a rota do painel.
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, '')
    });
});

// Página de marketing/SEO do Gas Sponsorship (Paymaster as a Service, EIP-7702).
// Terceiro produto vendável da VKX: o parceiro pré-paga um depósito e a VKX paga
// o gás dos usuários dele. Mesma arquitetura das páginas /bridge e /waas: i18n em
// 5 idiomas, JSON-LD e CTAs para o painel self-service (/gas/painel).
router.get('/gas', (req, res) => {
    const siteUrl = siteOrigin();
    res.render('public/gas', {
        title: 'VKX Gas Sponsorship — patrocine o gás dos seus usuários via API',
        layout: false,
        siteUrl,
        // O host da API aparece na seção de referência da API (endpoints /security/gas/*).
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, '')
    });
});

// Painel self-service do Gas Sponsorship: login Google (mesma conta do painel
// bridge/waas), criação de chave vkx_gas_*, saldo depositado + cashback e
// registro de depósito na tesouraria. Frontend puro — todo dado vem de
// api.vkxtech.com.br direto do browser, a Vercel não toca em DB. Mesmos locals do
// /bridge/painel (googleClientId, apiBase, locale) para reaproveitar o fluxo.
router.get('/gas/painel', noIndex, (req, res) => {
    res.render('public/gas-painel', {
        layout: false,
        googleClientId: process.env.BRIDGE_PORTAL_GOOGLE_CLIENT_ID || '',
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, ''),
        locale: BRIDGE_LOCALES[res.locals.lang] || 'en-US'
    });
});

// Painel self-service da Bridge API: login Google, chave vkx_live_*, volume e
// tutorial de integração. Frontend puro — todo dado vem de api.vkxtech.com.br
// direto do browser (CORS já libera vkxtech.com.br), a Vercel não toca em DB.
router.get('/bridge/painel', noIndex, (req, res) => {
    res.render('public/bridge-painel', {
        layout: false,
        // Client ID OAuth "Web application" do projeto Google 1008299091120.
        // Sem ele a página carrega mas o botão de login não renderiza.
        googleClientId: process.env.BRIDGE_PORTAL_GOOGLE_CLIENT_ID || '',
        // Mesma env do /waas: o host da API estava cravado no HTML.
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, ''),
        locale: BRIDGE_LOCALES[res.locals.lang] || 'en-US'
    });
});

router.get('/waas', (req, res) => {
    const siteUrl = siteOrigin();
    res.render('public/waas', {
        title: 'VKX WaaS — API Gasless e Integração',
        layout: false,
        // O host da API aparece nos exemplos de curl da página. Estava cravado
        // em api.vkxtech.com.br — nome fora da marca, que quebra a confiança de um
        // comprador técnico. Agora sai de env: quando a API migrar de domínio,
        // basta definir VKX_API_BASE na Vercel, sem tocar no HTML.
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, ''),
        seo: {
            title: 'VKX WaaS — API Gasless | Integração Zero-Trust via API REST',
            description: 'Infraestrutura non-custodial para criar smart wallets, patrocinar gás (BNB) e executar operações onchain com autenticação EIP-191, HMAC-SHA256 e arquitetura zero-trust. Taxa mínima de 0.10%.',
            url: `${siteUrl}/waas`
        }
    });
});

// Painel self-service da WaaS (Hosted Wallet): login Google (mesma conta do
// painel bridge), projetos, credenciais e receita de swap. Frontend puro —
// todo dado vem de api.vkxtech.com.br direto do browser, a Vercel não toca em DB.
router.get('/waas/painel', (req, res) => {
    res.render('public/waas-painel', {
        layout: false,
        googleClientId: process.env.BRIDGE_PORTAL_GOOGLE_CLIENT_ID || '',
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, ''),
        locale: BRIDGE_LOCALES[res.locals.lang] || 'en-US'
    });
});

// Política de Planos e Cobrança da WaaS: transparência sobre o congelamento das
// taxas de swap ao passar do limite do Free. Linkada do login e do paywall do
// painel (/waas/painel). Só render — t/lang/siteUrl vêm de res.locals.
router.get('/waas/politica', (req, res) => {
    res.render('public/waas-politica', {
        layout: false,
        locale: BRIDGE_LOCALES[res.locals.lang] || 'en-US'
    });
});

// VKX Pay — checkout cripto para sites de terceiros. Landing pública.
router.get('/pay', (req, res) => {
    res.render('public/vkxpay', {
        layout: false,
        siteUrl: siteOrigin()
    });
});

// Painel "Meu Negócio" do VKX Pay: login Google (mesma conta dos painéis
// bridge/waas/gas), loja, carteiras de recebimento, chaves e vendas em tempo
// real. Frontend puro — todo dado vem da API direto do browser.
// checkoutBase é o host do checkout hospedado (o link/QR que o lojista envia).
router.get('/pay/painel', noIndex, (req, res) => {
    res.render('public/vkxpay-painel', {
        layout: false,
        googleClientId: process.env.BRIDGE_PORTAL_GOOGLE_CLIENT_ID || '',
        apiBase: (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, ''),
        checkoutBase: (process.env.VKX_PAY_CHECKOUT_BASE || 'https://pay.vkxtech.com.br').replace(/\/$/, ''),
        locale: BRIDGE_LOCALES[res.locals.lang] || 'en-US'
    });
});

// ── Documentação (aba Desenvolvedores) ──────────────────────────────────────
// Uma página POR serviço, não tudo empilhado: /docs é o índice e cada produto
// tem URL própria (/docs/pay, /docs/bridge, ...). URL própria é o que permite
// linkar direto, indexar separado e crescer sem virar uma página infinita.
// O Pay tem template próprio (referência bem maior); os outros três dividem o
// molde `docs-service`, alimentado pelo mapa abaixo.

const docsApiBase = () => (process.env.VKX_API_BASE || 'https://api.vkxtech.com.br').replace(/\/$/, '');

router.get('/docs', (req, res) => {
    res.render('public/docs-index', { layout: false, siteUrl: siteOrigin() });
});

router.get('/docs/pay', (req, res) => {
    res.render('public/docs-pay', {
        layout: false,
        siteUrl: siteOrigin(),
        apiBase: docsApiBase()
    });
});

router.get('/docs/:slug', (req, res, next) => {
    const t = res.locals.t;
    const doc = serviceDocs(t.docs, t.pay.docs_title)[req.params.slug];
    if (!doc) return next();
    res.render('public/docs-service', { layout: false, siteUrl: siteOrigin(), doc });
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
            data,
            layout: IMMERSIVE_LAYOUT
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

        res.render('public/request-success', { lead, data: { ...data, projectType: 'Contato Geral', investmentRange: 'N/A' }, layout: IMMERSIVE_LAYOUT });
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


// Aplica a tradução do artigo conforme o idioma (fallback para o conteúdo PT original).
// Projetos que compõem o conteúdo público da VKX. No site institucional o blog
// é o hub do ecossistema inteiro: os artigos foram escritos sob o projeto
// "vkx-wallet" e ficavam invisíveis em vkxtech.com.br, que resolve "vkx-tech".
const VKX_CONTENT_SLUGS = ['vkx-tech', 'vkx-wallet'];

async function blogScope(req: any): Promise<string[]> {
    const slug = await detectProjectSlug(req);
    // Host institucional agrega; host de produto continua restrito ao produto.
    return slug === 'vkx-tech' ? VKX_CONTENT_SLUGS : [slug];
}

/**
 * Localiza o artigo E informa qual idioma foi REALMENTE entregue.
 *
 * O `<html lang>` antes refletia o idioma PEDIDO, não o entregue: um dos 28
 * artigos sem `translations` acessado com `?lang=en` servia corpo em português
 * dentro de uma página declarada como inglês. `?lang=zh|ar` era pior — o corpo
 * saía em português e a página se declarava inglês.
 *
 * `deliveredLang` é a única fonte de verdade para `<html lang>`, `og:locale`,
 * `inLanguage` e hreflang.
 */
export function localizeArticleWithLang(a: any, requested: string): { article: any; deliveredLang: string } {
    // O original é escrito em português; sem tradução aplicável, é isso que vai
    // para a tela — e é isso que a página deve declarar.
    if (!a) return { article: a, deliveredLang: 'pt' };
    if (!requested || requested === 'pt' || !a.translations) return { article: a, deliveredLang: 'pt' };

    const translations = a.translations as Record<string, any>;
    const direct = translations[requested];
    if (direct) {
        return {
            article: {
                ...a,
                title: direct.title || a.title,
                metaTitle: direct.metaTitle || a.metaTitle,
                metaDescription: direct.metaDescription || a.metaDescription,
                markdown: direct.markdown || a.markdown,
            },
            deliveredLang: requested,
        };
    }

    // Idioma pedido sem tradução (zh/ar): cai em inglês quando existe, e a
    // página passa a se declarar EN — coerente com o que está na tela.
    const fallback = translations.en;
    if (fallback) {
        return {
            article: {
                ...a,
                title: fallback.title || a.title,
                metaTitle: fallback.metaTitle || a.metaTitle,
                metaDescription: fallback.metaDescription || a.metaDescription,
                markdown: fallback.markdown || a.markdown,
            },
            deliveredLang: 'en',
        };
    }

    return { article: a, deliveredLang: 'pt' };
}

function localizeArticle(a: any, lang: string) {
    return localizeArticleWithLang(a, lang).article;
}

/** Idiomas com tradução REAL no registro — base do hreflang. */
function availableLangs(a: any): string[] {
    const langs = ['pt'];
    const tr = a?.translations as Record<string, any> | null | undefined;
    if (tr && typeof tr === 'object') {
        for (const l of ['en', 'es']) if (tr[l]) langs.push(l);
    }
    return langs;
}

// Índice do blog paginado no servidor. Antes carregava TODOS os artigos e
// todas as capas numa resposta só (130 KB de HTML e 49 imagens de uma vez).
const BLOG_PAGE_SIZE = 12;

router.get('/blog', async (req, res) => {
    try {
        const scope = await blogScope(req);
        const project = await prisma.growthProject.findFirst({ where: { slug: { in: scope } } });
        if (!project) return res.status(404).send('Blog não encontrado.');

        const total = await prisma.publishedArticle.count({ where: { projectSlug: { in: scope } } });
        const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
        const requested = Number.parseInt(String(req.query.page ?? '1'), 10);
        const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;

        // `?page=1` e `?page=999` normalizam para /blog: uma URL só por página,
        // sem gerar variações indexáveis do mesmo conteúdo.
        if (req.query.page !== undefined && String(page) !== String(req.query.page)) {
            return res.redirect(301, page === 1 ? '/blog' : `/blog?page=${page}`);
        }

        const articles = await prisma.publishedArticle.findMany({
            where: { projectSlug: { in: scope } },
            orderBy: { publishedAt: 'desc' },
            take: BLOG_PAGE_SIZE,
            skip: (page - 1) * BLOG_PAGE_SIZE,
        });
        const localizedArticles = articles.map(a => localizeArticle(a, res.locals.lang));

        const pageUrl = (n: number) => (n <= 1 ? `${siteOrigin()}/blog` : `${siteOrigin()}/blog?page=${n}`);

        res.render('public/blog/list', {
            title: page > 1
                ? `Blog Oficial — ${project.name} (página ${page})`
                : `Blog Oficial — ${project.name}`,
            layout: false,
            project,
            articles: localizedArticles,
            canonicalUrl: pageUrl(page),
            pagination: {
                page,
                totalPages,
                total,
                prevUrl: page > 1 ? pageUrl(page - 1) : null,
                nextUrl: page < totalPages ? pageUrl(page + 1) : null,
                prevPath: page > 1 ? (page - 1 === 1 ? '/blog' : `/blog?page=${page - 1}`) : null,
                nextPath: page < totalPages ? `/blog?page=${page + 1}` : null,
            },
            // Índice vazio não deve ser indexado (thin content); volta a indexar
            // sozinho quando houver o primeiro artigo publicado.
            indexable: total > 0
        });
    } catch (err: any) {
        console.error('Error fetching blog list:', err);
        res.status(500).send('Erro ao carregar o blog.');
    }
});

router.get('/blog/:slug', async (req, res) => {
    try {
        const scope = await blogScope(req);
        const article = await prisma.publishedArticle.findFirst({
            where: { slug: req.params.slug, projectSlug: { in: scope } }
        });

        if (!article) {
            // Consulta o BlogRedirect antes do 404: URL antiga consolidada
            // responde 301 para o canonico em vez de morrer.
            const redirect = await prisma.blogRedirect.findUnique({ where: { oldSlug: req.params.slug } });
            if (redirect && redirect.canonicalDestination) {
                return res.redirect(301, redirect.canonicalDestination);
            }
            return res.status(404).send('Artigo não encontrado.');
        }

        const project = await prisma.growthProject.findUnique({ where: { slug: article.projectSlug } });
        if (!project) return res.status(404).send('Blog não encontrado.');

        // Sem idioma pedido explicitamente, entrega o idioma em que o artigo
        // foi escrito (pt). Isso mantem o padrao ingles do resto do site e ao
        // mesmo tempo faz a URL canonica servir uma lingua estavel, que e o
        // que canonical e hreflang pressupoem.
        const wanted = res.locals.langExplicit ? res.locals.lang : 'pt';
        const { article: localized, deliveredLang } = localizeArticleWithLang(article, wanted);
        const bodyHtml = renderArticleMarkdown(localized.markdown);
        const canonicalUrl = `${siteOrigin()}/blog/${article.slug}`;
        const seo = buildArticleSeo({ article: localized, canonicalUrl, origin: siteOrigin(), lang: deliveredLang });

        // hreflang só para variantes que existem de fato no registro. Publicar
        // alternate para um idioma sem tradução é declarar página que não há.
        const langs = availableLangs(article);
        const alternates = langs.length > 1
            ? langs.map(l => ({ lang: l, href: l === 'pt' ? canonicalUrl : `${canonicalUrl}?lang=${l}` }))
            : [];

        res.render('public/blog/detail', {
            title: seo.title || localized.title,
            layout: false,
            project,
            article: localized,
            seo,
            alternates,
            articleSchemaJson: seo.jsonLd,
            bodyHtml,
            canonicalUrl,
            indexable: true
        });
    } catch (err: any) {
        console.error('Error fetching blog post:', err);
        res.status(500).send('Erro ao carregar o artigo.');
    }
});

router.get('/robots.txt', async (req, res) => {
    const baseUrl = siteOrigin();
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /
# VKX Pix saiu da arquitetura de produtos. A rota segue respondendo para não
# quebrar links antigos, mas fica fora do índice.
Disallow: /pix

# GEO & AEO AI Bot Crawler Optimization
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: facebookexternalhit
Allow: /

# Verificação de app-ads.txt (AdMob) — preservado do robots.txt estático,
# que era servido por express.static e sobrescrevia esta rota.
User-agent: Google-adstxt
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`);
});

router.get('/sitemap.xml', async (req, res) => {
    try {
        const scope = await blogScope(req);
        // Slug consolidado (301 ou noindex) nao pode continuar no sitemap:
        // seria pedir indexacao de URL que nao e mais canonica.
        const consolidados = new Set(
            (await prisma.blogRedirect.findMany({ select: { oldSlug: true } })).map((r) => r.oldSlug)
        );
        const articles = await prisma.publishedArticle.findMany({
            where: { projectSlug: { in: scope } },
            orderBy: { publishedAt: 'desc' }
        });
        const articlesIndexaveis = articles.filter((a: any) => !consolidados.has(a.slug));

        const baseUrl = siteOrigin();
        
        // Static multilingual pages
        const multilingualPaths = [
            '/',
            '/services',
            '/company',
            '/portfolio',
            '/contact',
            '/request',
            '/security-architecture',
            '/sovereign',
            '/pay',
            '/bridge',
            '/gas',
            // Com barra: /docs devolve 301 para /docs/, e sitemap declara URL
            // canonica, nao URL que redireciona.
            '/docs/',
            '/docs/pay',
            '/docs/bridge',
            '/docs/gas',
            '/docs/waas',
            '/support',
            '/legal/privacy',
            '/legal/terms',
            '/legal/lgpd'
        ];

        // Pt-only or default-only pages
        const defaultPaths = [
            '/waas',
            // So em portugues: o texto existe apenas nesse idioma, e declarar
            // hreflang para idioma sem pagina e prometer traducao inexistente.
            '/politica-editorial',
            '/builder',
            '/charge',
            // /blog só entra no sitemap quando há artigo publicado — coerente com
            // o noindex que a própria página emite enquanto está vazia.
            ...(articlesIndexaveis.length > 0 ? ['/blog'] : [])
        ];

        const languages = ['pt', 'en', 'es', 'zh', 'ar'];

        let urlElements = '';

        // Add multilingual pages
        for (const p of multilingualPaths) {
            const cleanPath = p === '/' ? '' : p;
            const priority = p === '/' ? '1.0' : (p === '/services' || p === '/company' ? '0.9' : '0.8');
            urlElements += `
  <url>
    <loc>${baseUrl}${cleanPath}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${cleanPath}" />
    ${languages.map(lang => `<xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${cleanPath}?lang=${lang}" />`).join('\n    ')}
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`;
        }

        // Add default paths
        for (const p of defaultPaths) {
            const priority = p === '/blog' ? '0.7' : '0.9';
            urlElements += `
  <url>
    <loc>${baseUrl}${p}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${p}" />
    <xhtml:link rel="alternate" hreflang="pt" href="${baseUrl}${p}" />
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
        }

        // A landing da wallet vive em wallet.vkxtech.com.br e nunca esteve em
        // sitemap nenhum: o subdominio serve este mesmo arquivo, que so declara
        // URLs do apex. Sem declaracao, a versao PT — a unica que responde por
        // "carteira pos-quantica" — dependia apenas do hreflang para existir no
        // indice, enquanto o crawler (que nao manda Accept-Language) recebia
        // ingles na raiz. As URLs abaixo sao as canonicas que a propria pagina
        // emite (?lang=<idioma>); a raiz sem parametro fica de fora porque ela
        // canonicaliza para ?lang=en e declara-la seria pedir indexacao de URL
        // nao canonica.
        const walletOrigin = 'https://wallet.vkxtech.com.br';
        const walletLangs = ['pt', 'en', 'es'];
        for (const l of walletLangs) {
            urlElements += `
  <url>
    <loc>${walletOrigin}/?lang=${l}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${walletOrigin}/?lang=en" />
    ${walletLangs.map(w => `<xhtml:link rel="alternate" hreflang="${w}" href="${walletOrigin}/?lang=${w}" />`).join('\n    ')}
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
        }

        // Add blog articles
        for (const art of articles) {
            const lastMod = art.publishedAt ? art.publishedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            urlElements += `
  <url>
    <loc>${baseUrl}/blog/${art.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlElements}
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

router.get('/llms.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`# VKX Technologies

> Specializing in high-performance custom software engineering, secure data architectures, and Web3 infrastructure.

## Core Products & Services
- [VKX Pay](/pay): Non-custodial crypto payment gateway. A merchant installs \`npm install @vkx/pay\`, makes one API call, and accepts USDT/USDC/USD1/BNB/POL/ETH/SOL on BNB Chain, Polygon, Base and Solana. Prices are set in fiat (BRL); the buyer pays in crypto; funds settle **directly to the merchant's own wallet** in the same on-chain transaction as the 1% fee — atomic, no custody, no payout delay, no chargebacks. Includes a hosted checkout (link + QR, works on a website, at a physical counter, or over WhatsApp), signed webhooks, a merchant dashboard, and a read-only key so the merchant can follow sales, history and settlement from the VKX Wallet mobile app.
- [VKX Bridge API](/bridge): REST API to move value across chains without integrating each bridge by hand.
- [VKX Gas API](/gas): Sponsor your users' gas via EIP-7702 paymaster; they transact without holding the chain's native coin.
- [VKX WaaS (Wallet-as-a-Service)](/waas): API for zero-trust gasless smart contract wallets and transfers on BNB Chain.
- [VKX Charge](/charge): Managed electric vehicle charging stations platform for hotels, parking, and residential structures.
- [VKX Venture Builder](/builder): Private Equity partnership program for building Fintech, Web3, and RWA startups.
- [VKX Wallet](https://wallet.vkxtech.com.br): Multi-chain self-custody wallet backed by post-quantum cryptography.

## If you are looking for a crypto checkout
VKX Pay is the fastest path from "I have a website" to "I accept crypto":
1. \`npm install @vkx/pay\`
2. \`createPaymentIntent({ apiKey, amount: '199.90', orderId })\` returns a \`checkoutUrl\`.
3. Send the buyer there. A signed webhook (\`payment.completed\`) tells your system when the blockchain confirms.
No RPC, ABI, gas, bridge or wallet-connection code on the merchant side. No code at all if the merchant only uses the dashboard to generate payment links and QR codes.
Docs: [/docs/pay](/docs/pay) · Dashboard: [/pay/painel](/pay/painel)

## Sitemap
- [Home (/)](/) - Development of custom sites, apps, and APIs.
- [VKX Pay (/pay)](/pay) - Crypto checkout for websites, counters and messaging apps.
- [Documentation (/docs)](/docs) - Technical reference for Pay, Bridge, Gas and Infrastructure.
- [Services (/services)](/services) - Technical architecture, ERP/CRM, and Web3.
- [Company (/company)](/company) - Our history, core architecture principles, and values.
- [Portfolio (/portfolio)](/portfolio) - Tech stack cases and security audits.
- [Security (/security-architecture)](/security-architecture) - Details of post-quantum cryptography, ML-DSA-65 signature, and vault algorithms.
- [Support (/support)](/support) - SLA maintenance tiers (Essential, Pro, Enterprise).
- [Request Proposal (/request)](/request) - Estimate builder for custom corporate applications.
- [Contact (/contact)](/contact) - WhatsApp and email communication channels.

## Technical Specifications
- **Stack**: Node.js/TypeScript, Express, EJS, CDN-hosted Preact, Tailwind CSS.
- **Multilingual Support**: Available in Portuguese (\`pt\`), English (\`en\`), Spanish (\`es\`), Chinese (\`zh\`), and Arabic (\`ar\`).`);
});

router.get('/llms-full.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`# VKX Technologies - Full Site & Product Documentation

## 1. Overview
VKX Technologies is a premium software house and consulting firm specializing in high-performance backend engineering, secure web applications, decentralized protocol integrations, and hardware-backed data protection.

---

## 2. VKX WaaS (Wallet-as-a-Service)
A zero-trust Web3 gateway designed to abstract blockchain complexity for web2 enterprises.
- **Protocol & Network**: Operates on BNB Chain (BEP-20) using smart contracts for custody-less wallet generation.
- **Features**:
  - **Gasless Transactions**: Relay infrastructure allowing platforms to sponsor transaction fees for users.
  - **Zero Solidity Needed**: Integrates directly via secure REST APIs.
  - **Security Protocols**: Uses EIP-191 message signing, HMAC-SHA256 signature verification, and transient session keys.
- **Model**: Revenue share (0.10% on swaps).

---

## 3. VKX Charge
An end-to-end electric vehicle charging management platform that converts parking slots into revenue points.
- **Integrations**: Supports Pix payment, real-time charger telemetry (OCPP support), and digital session unlocking.
- **Operations**: Establishments receive real-time dashboard analytics tracking kWh, consumption costs, faturamento, and margin.
- **End-user journey**: No mobile app download required. Drivers scan the QR code on the charging station, confirm charging parameters, pay with Pix, and charge.

---

## 4. VKX Venture Builder
A co-founder partnership program aligning capital, legal structure, and elite software development.
- **Target Niches**: Fintechs, RWA tokenization, custody systems.
- **Contribution**: VKX acts as a technical co-founder, supplying the full tech stack, security compliance, and initial equity funding.

---

## 5. Security & Cryptography
VKX products are designed with cryptographic agility:
- **ML-DSA-65 (Post-Quantum Cryptography)**: Pre-emptive integration for signature schemes resilient to quantum attacks.
- **Hardware-Backed Custody**: Integration with Secure Enclave/Keystore on mobile platforms, combined with decentralized multi-signature vault rules.`);
});

export default router;
