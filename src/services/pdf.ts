import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFService {
    private static async getBrowser() {
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
            const chromium = (await import('@sparticuz/chromium-min')).default as any;
            const puppeteer = (await import('puppeteer-core')).default;
            
            return await (puppeteer as any).launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport as any,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless as any,
            });
        } else {
            // Local fallback (expects local chrome/chromium installed)
            const puppeteer = (await import('puppeteer-core')).default;
            const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // common windows path
            
            return await puppeteer.launch({
                executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
    }

    static async generateQuote(quote: any, lead: any): Promise<string> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1b; margin: 40px; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2EF2C8; padding-bottom: 20px; margin-bottom: 40px; }
                    .logo { font-size: 28px; font-weight: 800; color: #2EF2C8; letter-spacing: -1px; }
                    .proposal-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #121214; }
                    .details { margin-top: 20px; font-size: 14px; }
                    .details strong { color: #555; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
                    .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                    .table th { background-color: #f8f9fa; color: #555; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; padding: 15px; border-bottom: 2px solid #eee; }
                    .table td { padding: 15px; border-bottom: 1px solid #eee; font-size: 14px; }
                    .total-box { margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 12px; text-align: right; }
                    .total-label { font-size: 12px; color: #777; font-weight: bold; text-transform: uppercase; }
                    .total-value { font-size: 24px; font-weight: 800; color: #121214; }
                    .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; font-size: 10px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                    .terms { margin-top: 40px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">VKX TECHNOLOGIES</div>
                    <div style="text-align: right; font-size: 12px;">
                        <strong>PROPOSTA #${quote.id.substring(0, 8)}</strong><br>
                        Data: ${new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>
                
                <h1 class="proposal-title">${quote.title}</h1>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                    <div class="details">
                        <strong>Contratante</strong><br>
                        ${lead.name}<br>
                        ${lead.companyName ? lead.companyName : ''}<br>
                        ${lead.email}
                    </div>
                    <div class="details">
                        <strong>Prazo Estimado</strong><br>
                        ${quote.estimatedWeeks || 'A definir'} semanas
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th align="left">Descrição dos Serviços</th>
                            <th align="right">Valor (BRL)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${JSON.parse(quote.items).map((item: any) => `
                            <tr>
                                <td>${item.description}</td>
                                <td align="right">R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-box">
                    <div class="total-label">Total do Investimento</div>
                    <div class="total-value">R$ ${quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div class="terms">
                    <strong>Condições de Pagamento:</strong><br>
                    ${quote.paymentTerms || '50% na aprovação e 50% na conclusão.'}
                </div>

                <div class="footer">
                    Válido por 10 dias. VKX Technologies - CNPJ: 33.070.993/0001-27<br>
                    Liderança em Engenharia de Software e Segurança Digital.
                </div>
            </body>
            </html>
        `;

        await page.setContent(html);
        const fileName = `proposta_${quote.id}.pdf`;
        const dir = path.join(process.cwd(), 'public/pdf');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        await page.pdf({ format: 'A4' }); // Buffer can be returned, but let's keep writing to disk if it works
        const filePath = path.join(dir, fileName);
        await page.pdf({ path: filePath, format: 'A4' });

        await browser.close();
        return `/pdf/${fileName}`;
    }

    static async generateCommercialDoc(doc: any, lead: any): Promise<string> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1a1a1b; margin: 60px; line-height: 1.6; font-size: 12px; }
                    .header { text-align: center; margin-bottom: 50px; }
                    .logo { font-size: 24px; font-weight: 800; color: #2EF2C8; margin-bottom: 20px; }
                    h1 { font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 30px; text-align: center; }
                    .content { white-space: pre-wrap; }
                    .page-break { page-break-before: always; }
                    .footer { position: fixed; bottom: 40px; text-align: center; width: 100%; color: #999; font-size: 9px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">VKX TECHNOLOGIES</div>
                    <h1>${doc.type === 'CONTRATO' ? 'Contrato de Prestação de Serviços' : 'SLA - Acordo de Nível de Serviço'}</h1>
                </div>
                
                <div class="content">
                    ${doc.content}
                </div>

                <div class="footer">
                    Página 1 de 1. Gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}<br>
                    VKX Technologies - CNPJ: 33.070.993/0001-27
                </div>
            </body>
            </html>
        `;

        await page.setContent(html);
        const fileName = `${doc.type.toLowerCase()}_${doc.id}.pdf`;
        const dir = path.join(process.cwd(), 'public/pdf');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filePath = path.join(dir, fileName);
        await page.pdf({ path: filePath, format: 'A4' });

        await browser.close();
        return `/pdf/${fileName}`;
    }
}
