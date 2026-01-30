import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { prisma, logger } from '../server.js';

export class MailService {
    static async sendFollowUp() {
        logger.info('Iniciando processamento de sequências de follow-up...');

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const now = new Date();

        // Find leads with consent and in "Novo" or "Em Análise" status
        const leads = await prisma.lead.findMany({
            where: {
                consent: true,
                status: { in: ['Novo', 'Em Análise'] },
            }
        });

        for (const lead of leads) {
            try {
                let shouldSend = false;
                let subject = '';
                let html = '';
                let nextStep = lead.sequenceStep;

                const daysSinceCreated = Math.floor((now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                const daysSinceLastEmail = lead.lastEmailedAt 
                    ? Math.floor((now.getTime() - lead.lastEmailedAt.getTime()) / (1000 * 60 * 60 * 24))
                    : 999;

                // Day 1 (Immediate or next day)
                if (lead.sequenceStep === 0 && daysSinceCreated >= 1) {
                    shouldSend = true;
                    subject = 'Analisamos sua solicitação | VKX Technologies';
                    html = `
                        <h1>Olá ${lead.name},</h1>
                        <p>Recebemos seus detalhes técnicos e nossa equipe já iniciou a análise de viabilidade do projeto.</p>
                        <p>Prezamos pelo rigor técnico e entraremos em contato caso o escopo esteja alinhado ao nosso perfil de atuação.</p>
                        <p>Atenciosamente,<br>Equipe VKX Technologies</p>
                    `;
                    nextStep = 1;
                } 
                // Day 3
                else if (lead.sequenceStep === 1 && daysSinceCreated >= 3 && daysSinceLastEmail >= 1) {
                    shouldSend = true;
                    subject = 'Podemos avançar com seu projeto? | VKX Technologies';
                    html = `
                        <h1>Olá ${lead.name},</h1>
                        <p>Ainda estamos analisando as possibilidades para sua demanda técnica.</p>
                        <p>Você teria disponibilidade para uma breve call de alinhamento técnico nos próximos dias?</p>
                        <p><a href="https://wa.me/5589999307197">Falar com Desenvolvedor</a></p>
                    `;
                    nextStep = 2;
                }
                // Day 7
                else if (lead.sequenceStep === 2 && daysSinceCreated >= 7 && daysSinceLastEmail >= 1) {
                    shouldSend = true;
                    subject = 'Encerrando análise do pedido | VKX Technologies';
                    html = `
                        <h1>Olá ${lead.name},</h1>
                        <p>Como não tivemos um retorno para sua solicitação, estamos encerrando o ticket de análise técnica por enquanto.</p>
                        <p>Caso deseje retomar futuramente, nossa equipe permanece à disposição.</p>
                    `;
                    nextStep = 3; // Finished
                }

                if (shouldSend) {
                    const token = Math.random().toString(36).substring(7);
                    await prisma.unsubscribe.upsert({
                        where: { email: lead.email },
                        create: { email: lead.email, token },
                        update: { token }
                    });

                    await transporter.sendMail({
                        from: process.env.SMTP_FROM,
                        to: lead.email,
                        subject: subject,
                        html: `
                            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
                                ${html}
                                <br><br>
                                <hr style="border: 0; border-top: 1px solid #eee;">
                                <small style="color: #999;">
                                    VKX Technologies | CNPJ: 33.070.993/0001-27<br>
                                    Para não receber mais estes e-mails, <a href="${process.env.SITE_URL}/unsubscribe?token=${token}">clique aqui</a>.
                                </small>
                            </div>
                        `
                    });

                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { 
                            lastEmailedAt: new Date(),
                            sequenceStep: nextStep
                        }
                    });

                    logger.info(`Follow-up Step ${lead.sequenceStep} enviado para ${lead.email}`);
                }
            } catch (err) {
                logger.error(`Erro ao processar e-mail para ${lead.email}: ${err}`);
            }
        }
    }

    static startCron() {
        // Runs every day at 09:00 AM
        cron.schedule('0 9 * * *', () => {
            this.sendFollowUp();
        });
    }
}
