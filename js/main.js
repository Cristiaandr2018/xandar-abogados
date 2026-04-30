const CONFIG = {
  // Número de WhatsApp con código de país (sin + ni espacios)
  whatsappNumber: "573213712610",
  // Mensaje predeterminado al abrir WhatsApp
  whatsappMessage: "Hola, me gustaría obtener más información.",
  // Personalidad del bot (system prompt)
  systemPrompt: `Eres un asistente virtual amigable y profesional de una empresa. 
Responde en español de forma concisa y útil (máximo 3 oraciones por respuesta). 
Si el usuario necesita ayuda más detallada o quiere hablar con una persona, 
sugiérele que contacte por WhatsApp. Nunca inventes información específica 
sobre precios o políticas; en esos casos, dirígelos a WhatsApp.`
};
// =============================================
 
const panel    = document.getElementById('cb-panel');
const toggle   = document.getElementById('cb-toggle');
const closeBtn = document.getElementById('cb-close');
const input    = document.getElementById('cb-input');
const sendBtn  = document.getElementById('cb-send');
const messages = document.getElementById('cb-messages');
const badge    = document.getElementById('cb-badge');
const waBtn    = document.getElementById('cb-whatsapp-btn');
 
// Set initial time
document.getElementById('cb-init-time').textContent = nowTime();
 
let history = [];
let isOpen  = false;
let isThinking = false;
 
function nowTime() {
  return new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
 
// Toggle open/close
toggle.addEventListener('click', () => {
  isOpen = !isOpen;
  panel.classList.toggle('open', isOpen);
  badge.style.opacity = isOpen ? '0' : '1';
  if (isOpen) { input.focus(); toggle.setAttribute('aria-label','Cerrar chat'); }
  else toggle.setAttribute('aria-label','Abrir chat');
});
closeBtn.addEventListener('click', () => {
  isOpen = false;
  panel.classList.remove('open');
  toggle.setAttribute('aria-label','Abrir chat');
});
 
// WhatsApp
waBtn.addEventListener('click', () => {
  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
  window.open(url, '_blank');
});
 
// Shortcut buttons
document.querySelectorAll('.cb-shortcut-btn').forEach(btn => {
  btn.addEventListener('click', () => sendMessage(btn.dataset.q));
});
 
// Input auto-resize
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 90) + 'px';
});
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtn.addEventListener('click', () => sendMessage());
 
function addMessage(text, role) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = nowTime();
  div.appendChild(time);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}
 
function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg typing';
  div.id = 'cb-typing';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'dot';
    div.appendChild(d);
  }
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}
 
function hideTyping() {
  const t = document.getElementById('cb-typing');
  if (t) t.remove();
}
 
async function sendMessage(overrideText) {
  const text = (overrideText || input.value).trim();
  if (!text || isThinking) return;
  if (!overrideText) { input.value = ''; input.style.height = 'auto'; }
 
  addMessage(text, 'user');
  history.push({ role: 'user', content: text });
  sendBtn.disabled = true;
  isThinking = true;
  showTyping();
 
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: CONFIG.systemPrompt,
        messages: history
      })
    });
 
    const data = await res.json();
    hideTyping();
 
    let botText = '';
    if (data.content && data.content[0] && data.content[0].text) {
      botText = data.content[0].text;
    } else if (data.error) {
      botText = 'Lo siento, hubo un problema técnico. Por favor contáctanos por WhatsApp.';
    }
 
    history.push({ role: 'assistant', content: botText });
    addMessage(botText, 'bot');
  } catch (err) {
    hideTyping();
    addMessage('Ups, no pude conectarme. ¿Te contactamos por WhatsApp? 💬', 'bot');
  }
 
  sendBtn.disabled = false;
  isThinking = false;
  input.focus();
}