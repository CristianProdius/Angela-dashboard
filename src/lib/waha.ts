const WAHA_API_URL = process.env.WAHA_API_URL || "http://localhost:3000";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const SESSION = "default";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (WAHA_API_KEY) {
    headers["X-Api-Key"] = WAHA_API_KEY;
  }
  return headers;
}

async function wahaFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${WAHA_API_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WAHA API error ${res.status}: ${text}`);
  }

  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Set presence (online/offline)
async function setPresence(status: "online" | "offline") {
  try {
    await wahaFetch(`/api/${SESSION}/presence`, {
      method: "POST",
      body: JSON.stringify({ presence: status }),
    });
  } catch {
    // Non-critical, continue
  }
}

// Start typing indicator in a chat
async function startTyping(chatId: string) {
  try {
    await wahaFetch("/api/startTyping", {
      method: "POST",
      body: JSON.stringify({ chatId, session: SESSION }),
    });
  } catch {
    // Non-critical, continue
  }
}

// Stop typing indicator in a chat
async function stopTyping(chatId: string) {
  try {
    await wahaFetch("/api/stopTyping", {
      method: "POST",
      body: JSON.stringify({ chatId, session: SESSION }),
    });
  } catch {
    // Non-critical, continue
  }
}

/**
 * Send a text message with human-like behavior to avoid blocking:
 * 1. Go online
 * 2. Start typing for 2-4 seconds
 * 3. Stop typing
 * 4. Send message
 * 5. Go offline (so phone still gets notifications)
 */
export async function sendTextMessage(phone: string, text: string) {
  const chatId = `${phone}@c.us`;

  // Simulate human behavior
  await setPresence("online");
  await sleep(1000);

  await startTyping(chatId);
  // Typing duration: 2-4 seconds (randomized to look natural)
  const typingDuration = 2000 + Math.random() * 2000;
  await sleep(typingDuration);
  await stopTyping(chatId);

  await sleep(500);

  // Send the actual message
  const result = await wahaFetch("/api/sendText", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      text,
      session: SESSION,
    }),
  });

  // Go back offline so phone gets notifications
  await sleep(1000);
  await setPresence("offline");

  return result;
}

export async function getSessionStatus(): Promise<{
  status: string;
  name?: string;
}> {
  try {
    const data = await wahaFetch(`/api/sessions/${SESSION}`);
    return { status: data.status, name: data.name };
  } catch (error) {
    console.error("WAHA getSessionStatus error:", error);
    return { status: "DISCONNECTED" };
  }
}

export async function getQRCode(): Promise<{ qr?: string; error?: string }> {
  try {
    const res = await fetch(
      `${WAHA_API_URL}/api/sessions/${SESSION}/auth/qr`,
      {
        headers: authHeaders(),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("WAHA getQRCode error:", res.status, text);
      return { error: `QR indisponibil (${res.status})` };
    }
    const data = await res.json();
    return { qr: data.value };
  } catch (error) {
    console.error("WAHA getQRCode unreachable:", error);
    return { error: "WAHA inaccesibil" };
  }
}

export async function startSession(): Promise<void> {
  try {
    await wahaFetch("/api/sessions/start", {
      method: "POST",
      body: JSON.stringify({ name: SESSION }),
    });
  } catch {
    // Session might already exist
  }
}
