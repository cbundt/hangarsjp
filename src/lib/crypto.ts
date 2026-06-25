// AES-256-GCM para criptografia do CPF (LGPD)
// Roda apenas no servidor (Node.js crypto)

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.CPF_ENCRYPTION_KEY ?? "";

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("CPF_ENCRYPTION_KEY inválida — deve ter 32 bytes em hex (64 chars)");
  }
  return Buffer.from(KEY_HEX, "hex");
}

export function encryptCpf(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96 bits para GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // formato: iv(24) + tag(32) + ciphertext — tudo em hex, separado por "."
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(".");
}

export function decryptCpf(encoded: string): string {
  const key = getKey();
  const [ivHex, tagHex, cipherHex] = encoded.split(".");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
