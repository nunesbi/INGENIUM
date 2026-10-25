import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

const CONTACT_TO = "contato@ingeniumxy.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBody(body: unknown): { nome: string; email: string; mensagem: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const mensagem = typeof b.mensagem === "string" ? b.mensagem.trim() : "";
  if (!nome || nome.length > 200) return null;
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return null;
  if (!mensagem || mensagem.length > 5000) return null;
  return { nome, email, mensagem };
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

router.post("/contact", async (req, res) => {
  const parsed = parseBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Validation error" });
    return;
  }
  const { nome, email, mensagem } = parsed;

  const transporter = getTransporter();
  if (!transporter) {
    req.log.error("SMTP not configured (missing SMTP_HOST/USER/PASS)");
    res.status(503).json({ error: "Email service not configured" });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Ingenium Site" <${process.env.SMTP_USER}>`,
      to: CONTACT_TO,
      replyTo: `"${nome}" <${email}>`,
      subject: `Contato Ingenium — ${nome}`,
      text: `Nome: ${nome}\nEmail: ${email}\n\n${mensagem}`,
      html: `<p><strong>Nome:</strong> ${nome}</p><p><strong>Email:</strong> ${email}</p><p style="white-space:pre-wrap">${mensagem.replace(/</g, "&lt;")}</p>`,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to send contact email");
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
