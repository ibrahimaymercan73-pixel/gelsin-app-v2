/**
 * GELSİN mail şablonları (mavi-turuncu tema)
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function wrapBody(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:system-ui,sans-serif;color:#1e293b;">
  <div style="max-width:32rem;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:1.25rem;border-radius:1rem 1rem 0 0;text-align:center;"><strong>GELSİN</strong>.app</div>
    <div style="background:#fff;padding:1.5rem;border:1px solid #f1f5f9;border-top:none;border-radius:0 0 1rem 1rem;">${content}</div>
    <p style="text-align:center;color:#94a3b8;font-size:.75rem;margin-top:1rem;">GELSİN platformu</p>
  </div>
</body></html>`
}

export function newOfferEmailHtml(providerName: string, offerPrice: string, jobTitle: string): string {
  const content = `<h2 style="margin:0 0 .75rem;font-size:1.25rem;">İşine Yeni Bir Teklif Geldi! 💰</h2>
    <p style="margin:0 0 1rem;"><strong>${esc(jobTitle)}</strong> ilanına bir uzman teklif verdi.</p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem;margin:1rem 0;border-radius:0 .5rem .5rem 0;">
      <p style="margin:0;"><strong>👤 Uzman:</strong> ${esc(providerName)}</p>
      <p style="margin:.5rem 0 0;font-size:1.25rem;color:#1e3a5f;"><strong>💰 Teklif:</strong> ${esc(offerPrice)} ₺</p>
    </div>
    <a href="https://gelsin.dev/customer/jobs" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;font-weight:700;border-radius:.75rem;text-decoration:none;">Tekliflere Git →</a>`
  return wrapBody(content)
}

export function offerAcceptedEmailHtml(
  customerName: string,
  customerPhone: string | null,
  customerEmail: string | null,
  jobTitle: string,
  jobAddress: string,
  agreedPrice: string
): string {
  const contact = [customerName, customerPhone && `Tel: ${customerPhone}`, customerEmail && `E-posta: ${customerEmail}`].filter(Boolean).join(' · ')
  const content = `<h2 style="margin:0 0 .75rem;font-size:1.25rem;">Tebrikler, İş Senin! 🎉</h2>
    <p style="margin:0 0 1rem;">Verdiğin teklif kabul edildi.</p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem;margin:1rem 0;border-radius:0 .5rem .5rem 0;">
      <p style="margin:0;"><strong>📋 İş:</strong> ${esc(jobTitle)}</p>
      <p style="margin:.5rem 0 0;"><strong>📍 Adres:</strong> ${esc(jobAddress)}</p>
      <p style="margin:.5rem 0 0;"><strong>💰 Tutar:</strong> ${esc(agreedPrice)} ₺</p>
    </div>
    <p style="margin:1rem 0 0;font-weight:600;">Müşteri iletişim:</p>
    <p style="margin:.5rem 0 0;color:#475569;">${esc(contact)}</p>
    <a href="https://gelsin.dev/provider/my-jobs" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;font-weight:700;border-radius:.75rem;text-decoration:none;">İşlerime Git →</a>`
  return wrapBody(content)
}
