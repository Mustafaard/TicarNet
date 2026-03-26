import nodemailer from 'nodemailer'
import { config, getSmtpMissingEnvVars, isSmtpConfigured } from '../config.js'

let transporter

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    const missing = getSmtpMissingEnvVars()
    throw new Error(
      `SMTP ayarları eksik: ${missing.join(', ')}. server/.env içinde Gmail için SMTP_USER + SMTP_APP_PASSWORD (uygulama şifresi) + MAIL_FROM tanımlayın.`,
    )
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  }

  return transporter
}

export async function sendPasswordResetEmail({
  to,
  username,
  resetUrl,
  alternativeResetUrls = [],
  expiresMinutes,
}) {
  const safeUsername = username || 'Oyuncu'
  const safeExpires = Number.isFinite(Number(expiresMinutes))
    ? Math.max(1, Math.trunc(Number(expiresMinutes)))
    : 3
  const safeAlternativeUrls = Array.isArray(alternativeResetUrls)
    ? alternativeResetUrls
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .slice(0, 2)
    : []
  const safeResetUrl = String(resetUrl || '').trim()

  const subject = 'TicarNet Online - Şifre Sıfırlama Bağlantısı'
  const textParts = [
    `Merhaba ${safeUsername},`,
    '',
    'Şifre sıfırlama talebiniz alındı.',
    `Aşağıdaki bağlantıya tıklayarak ${safeExpires} dakika içinde şifrenizi yenileyebilirsiniz:`,
    '',
    safeResetUrl,
  ]

  if (safeAlternativeUrls.length > 0) {
    textParts.push('', 'Yedek bağlantılar:')
    for (const url of safeAlternativeUrls) {
      textParts.push(url)
    }
  }

  textParts.push(
    '',
    'Bu talebi siz yapmadıysanız bu e-postayı dikkate almayın.',
    '',
    'TicarNet Online',
  )

  const htmlUsername = escapeHtml(safeUsername)
  const htmlResetUrl = escapeHtml(safeResetUrl)

  const htmlAlternativeLinks = safeAlternativeUrls.length > 0
    ? `
      <p style="font-size:13px;color:#334155;margin-top:8px;">Yedek bağlantılar:</p>
      <ul style="font-size:13px;color:#334155;padding-left:18px;margin:8px 0 0;">
        ${safeAlternativeUrls.map((url) => `<li style="margin-bottom:6px;word-break:break-all;">${escapeHtml(url)}</li>`).join('')}
      </ul>
    `
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <h2 style="margin-bottom:12px;">TicarNet Online</h2>
      <p>Merhaba <strong>${htmlUsername}</strong>,</p>
      <p>Şifre sıfırlama talebiniz alındı.</p>
      <p>
        Aşağıdaki butona tıklayarak <strong>${safeExpires} dakika</strong> içinde şifrenizi yenileyebilirsiniz.
      </p>
      <p style="margin:24px 0;">
        <a href="${htmlResetUrl}" style="background:#0ea5e9;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;">
          Şifreyi Yenile
        </a>
      </p>
      <p style="font-size:13px;color:#334155;">
        Buton çalışmazsa bu bağlantıyı tarayıcıya yapıştırın:
      </p>
      <p style="font-size:13px;word-break:break-all;">${htmlResetUrl}</p>
      ${htmlAlternativeLinks}
      <p style="font-size:13px;color:#334155;">
        Bu talebi siz yapmadıysanız bu e-postayı dikkate almayın.
      </p>
    </div>
  `

  const client = getTransporter()
  return client.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text: textParts.join('\n'),
    html,
  })
}

export async function sendSupportRequestEmail({
  to,
  ticketId,
  username,
  email,
  userId,
  title,
  description,
  createdAt,
  ipAddress,
  userAgent,
}) {
  const safeTo = String(to || '').trim() || config.supportInboxEmail
  const safeTicketId = String(ticketId || '').trim() || `SUP-${Date.now()}`
  const safeUsername = String(username || 'Oyuncu').trim() || 'Oyuncu'
  const safeEmail = String(email || '-').trim() || '-'
  const safeUserId = String(userId || '-').trim() || '-'
  const safeTitle = String(title || '').trim()
  const safeDescription = String(description || '').trim()
  const safeCreatedAt = String(createdAt || new Date().toISOString()).trim()
  const safeIp = String(ipAddress || '-').trim() || '-'
  const safeUserAgent = String(userAgent || '-').trim() || '-'

  const subject = `[TicarNet Destek] ${safeTicketId} - ${safeTitle}`

  const text = [
    'Yeni destek talebi alındı.',
    '',
    `Talep No: ${safeTicketId}`,
    `Kullanıcı: ${safeUsername}`,
    `E-posta: ${safeEmail}`,
    `Kullanıcı ID: ${safeUserId}`,
    `Tarih: ${safeCreatedAt}`,
    `IP: ${safeIp}`,
    `User-Agent: ${safeUserAgent}`,
    '',
    `Başlık: ${safeTitle}`,
    '',
    'Açıklama:',
    safeDescription,
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
      <h2 style="margin-bottom:12px;">TicarNet Destek Talebi</h2>
      <p style="margin:0 0 12px;"><strong>Talep No:</strong> ${escapeHtml(safeTicketId)}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
        <tbody>
          <tr><td style="padding:6px 0;font-weight:700;">Kullanıcı</td><td style="padding:6px 0;">${escapeHtml(safeUsername)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">E-posta</td><td style="padding:6px 0;">${escapeHtml(safeEmail)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Kullanıcı ID</td><td style="padding:6px 0;">${escapeHtml(safeUserId)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">Tarih</td><td style="padding:6px 0;">${escapeHtml(safeCreatedAt)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700;">IP</td><td style="padding:6px 0;">${escapeHtml(safeIp)}</td></tr>
        </tbody>
      </table>
      <p style="margin:0 0 8px;"><strong>Başlık:</strong> ${escapeHtml(safeTitle)}</p>
      <div style="padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;white-space:pre-wrap;line-height:1.5;">
        ${escapeHtml(safeDescription)}
      </div>
      <p style="margin-top:14px;font-size:12px;color:#475569;"><strong>User-Agent:</strong> ${escapeHtml(safeUserAgent)}</p>
    </div>
  `

  const client = getTransporter()
  return client.sendMail({
    from: config.smtp.from,
    to: safeTo,
    subject,
    text,
    html,
  })
}
