const API_BASE = 'http://localhost:8080/api';

export async function verifyCrashGame(gameId: string) {
  const response = await fetch(`${API_BASE}/verify/${gameId}`);
  return response.json();
}

export async function getCandleflipBatches() {
  const response = await fetch(`${API_BASE}/candleflip/batches`);
  return response.json();
}

export async function getCandleflipBatch(batchId: string) {
  const response = await fetch(`${API_BASE}/candleflip/batch/${batchId}`);
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}