const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

function alert(text) {
    errorMessage.textContent = text;
    errorContainer.classList.remove('hidden');
};

async function generateApiKey(secret) {
    const currentMinute = Math.floor(Date.now() / 60000).toString();
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(currentMinute)
    );
    // Konversi signature ke hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }