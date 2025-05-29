const fetch = require('node-fetch');

const API_URL_MESSAGES = 'https://jjzhoxojmcksxrsgupxr.supabase.co/rest/v1/chatbot_messages';
const API_URL_SESSIONS = 'https://jjzhoxojmcksxrsgupxr.supabase.co/rest/v1/chatbot_sessions';
const API_KEY = process.env.API_KEY;

async function run() {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const startOfDay = `${yyyy}-${mm}-${dd}T00:00:00Z`;

  const nextDay = new Date(today);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const yyyy2 = nextDay.getUTCFullYear();
  const mm2 = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
  const dd2 = String(nextDay.getUTCDate()).padStart(2, '0');
  const startOfNextDay = `${yyyy2}-${mm2}-${dd2}T00:00:00Z`;

  const urlMessages = `${API_URL_MESSAGES}?timestamp=gte.${startOfDay}&timestamp=lt.${startOfNextDay}`;

  const resMessages = await fetch(urlMessages, {
    method: 'GET',
    headers: {
      apikey: API_KEY,
      Authorization: API_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });

  if (!resMessages.ok) {
    throw new Error(`Error fetching messages: ${resMessages.status} ${resMessages.statusText}`);
  }

  const messages = await resMessages.json();

  if (messages.length === 0) {
    console.log("Tidak ada pesan hari ini. Keluar.");
    return;
  }

  const grouped = {};
  for (const msg of messages) {
    if (!grouped[msg.sessions_id]) {
      grouped[msg.sessions_id] = [];
    }
    grouped[msg.sessions_id].push(msg);
  }

  const summaries = {};
  for (const sessionId in grouped) {
    const aiMessages = grouped[sessionId]
      .filter(m => m.sender === 'human')
      .map(m => m.message.trim())
      .filter(Boolean);

    summaries[sessionId] = aiMessages.join('. ') + (aiMessages.length > 0 ? '.' : '');
  }

  for (const sessionId in summaries) {
    const summary = summaries[sessionId];
    const urlUpdate = `${API_URL_SESSIONS}?id=eq.${sessionId}`;

    const resUpdate = await fetch(urlUpdate, {
      method: 'PATCH',
      headers: {
        apikey: API_KEY,
        Authorization: API_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ summary }),
    });

    if (!resUpdate.ok) {
      throw new Error(`Error updating session ${sessionId}: ${resUpdate.status} ${resUpdate.statusText}`);
    }
  }

  console.log(`Berhasil update ${Object.keys(summaries).length} sesi.`);
}

run().catch(err => {
  console.error("Gagal menjalankan script:", err);
  process.exit(1);
});
