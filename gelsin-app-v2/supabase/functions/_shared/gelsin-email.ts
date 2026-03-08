/**
 * GELSİN kurumsal kimlik: Mavi–Turuncu modern mail şablonları
 * Resend ile kullanım için HTML fragment'lar
 */

const styles = {
  wrapper: 'font-sans text-slate-800 max-w-lg mx-auto',
  header: 'bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white px-6 py-5 rounded-t-2xl text-center',
  logo: 'font-black text-2xl',
  body: 'bg-white px-6 py-6 rounded-b-2xl border border-slate-100 border-t-0 shadow-sm',
  highlight: 'bg-amber-50 border-l-4 border-amber-500 text-slate-800 px-4 py-3 rounded-r-xl my-4',
  cta: 'inline-block mt-4 px-6 py-3 bg-[#2563eb] text-white font-bold rounded-xl no-underline',
  footer: 'text-center text-slate-400 text-xs mt-6',
  divider: 'border-t border-slate-100 my-4',
}

function wrapHtml(content: string, subjectLabel?: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectLabel ?? 'GELSİN'}</title>
</head>
<body style="margin:0;padding:20px;background:#f1f5f9;">
  <div class="${styles.wrapper}" style="max-width:32rem;margin:0 auto;font-family:system-ui,sans-serif;color:#1e293b;">
    <div class="${styles.header}" style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:1.25rem 1.5rem;border-radius:1rem 1rem 0 0;text-align:center;">
      <span class="${styles.logo}" style="font-weight:800;font-size:1.5rem;">GELSİN</span><span style="opacity:.9;">.app</span>
    </div>
    <div class="${styles.body}" style="background:#fff;padding:1.5rem;border:1px solid #f1f5f9;border-top:none;border-radius:0 0 1rem 1rem;box-shadow:0 1px 3px rgba(0,0,0,.05);">
      ${content}
    </div>
    <p class="${styles.footer}" style="text-align:center;color:#94a3b8;font-size:.75rem;margin-top:1.5rem;">Bu mail GELSİN platformu tarafından gönderilmiştir.</p>
  </div>
</body>
</html>`
}

/** Müşteriye: İşine yeni teklif geldi */
export function newOfferEmailHtml(providerName: string, offerPrice: string, jobTitle: string) {
  const content = `
    <h2 style="margin:0 0 .75rem;font-size:1.25rem;">İşine Yeni Bir Teklif Geldi! 💰</h2>
    <p style="margin:0 0 1rem;line-height:1.6;"><strong>${escapeHtml(jobTitle)}</strong> ilanına bir uzman teklif verdi.</p>
    <div class="${styles.highlight}" style="background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem 1.25rem;border-radius:0 .5rem .5rem 0;margin:1rem 0;">
      <p style="margin:0;font-weight:600;">👤 Uzman: ${escapeHtml(providerName)}</p>
      <p style="margin:.5rem 0 0;font-size:1.25rem;color:#1e3a5f;">💰 Teklif: ${escapeHtml(offerPrice)} ₺</p>
    </div>
    <p style="margin:0;color:#64748b;font-size:.9rem;">Teklifi görmek ve kabul etmek için uygulamaya giriş yapın.</p>
    <a href="https://gelsin.dev/customer/jobs" class="${styles.cta}" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;font-weight:700;border-radius:.75rem;text-decoration:none;">Tekliflere Git →</a>
  `
  return wrapHtml(content, 'İşine Yeni Teklif')
}

/** Ustaya: Teklifin kabul edildi */
export function offerAcceptedEmailHtml(
  customerName: string,
  customerPhone: string | null,
  customerEmail: string | null,
  jobTitle: string,
  jobAddress: string,
  agreedPrice: string
) {
  const contact = [customerName, customerPhone && `Tel: ${customerPhone}`, customerEmail && `E-posta: ${customerEmail}`]
    .filter(Boolean)
    .join(' · ')
  const content = `
    <h2 style="margin:0 0 .75rem;font-size:1.25rem;">Tebrikler, İş Senin! 🎉</h2>
    <p style="margin:0 0 1rem;line-height:1.6;">Verdiğin teklif kabul edildi. Müşteri bilgileri ve iş detayları aşağıda.</p>
    <div class="${styles.highlight}" style="background:#fffbeb;border-left:4px solid #f59e0b;padding:1rem 1.25rem;border-radius:0 .5rem .5rem 0;margin:1rem 0;">
      <p style="margin:0;font-weight:600;">📋 İş: ${escapeHtml(jobTitle)}</p>
      <p style="margin:.5rem 0 0;">📍 Adres: ${escapeHtml(jobAddress)}</p>
      <p style="margin:.5rem 0 0;">💰 Anlaşılan tutar: ${escapeHtml(agreedPrice)} ₺</p>
    </div>
    <div class="${styles.divider}" style="border-top:1px solid #f1f5f9;margin:1rem 0;"></div>
    <p style="margin:0;font-weight:600;">Müşteri iletişim:</p>
    <p style="margin:.5rem 0 0;color:#475569;">${escapeHtml(contact)}</p>
    <a href="https://gelsin.dev/provider/my-jobs" class="${styles.cta}" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;font-weight:700;border-radius:.75rem;text-decoration:none;">İşlerime Git →</a>
  `
  return wrapHtml(content, 'Teklifin Kabul Edildi')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
