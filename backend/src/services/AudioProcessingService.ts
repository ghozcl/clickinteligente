// src/services/AudioProcessingService.ts
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileTypeFromBuffer } from "file-type";
import { v4 as uuidv4 } from "uuid";
import uploadConfig from "../config/upload";

const execFileAsync = promisify(execFile);

const TMP_PUBLIC_DIR = path.resolve(__dirname, "../../public/tmp"); 
// Antes: path.join(__dirname, "..", "..", "public", "tmp")
if (!existsSync(TMP_PUBLIC_DIR)) mkdirSync(TMP_PUBLIC_DIR, { recursive: true });

function parseKeyOrIv(value?: string): Buffer | null {
  if (!value) return null;
  // intenta hex
  try {
    const b = Buffer.from(value, "hex");
    if (b.length >= 1) return b;
  } catch (e) {
    // ignore
  }
  // intenta base64
  try {
    const b = Buffer.from(value, "base64");
    if (b.length >= 1) return b;
  } catch (e) {
    // ignore
  }
  return null;
}

export interface ProcessedAudioResult {
  filePath: string;      // ruta en disco del archivo final convertido (mp3/wav)
  publicUrl?: string;    // url pública si APP_PUBLIC_URL está configurada
  mimeType?: string;
}

// Descifra buffer con algoritmo proporcionado
export async function decryptBufferIfNeeded(
  buffer: Buffer,
  options?: { key?: Buffer | string; iv?: Buffer | string; algorithm?: string }
): Promise<Buffer> {
  const keyEnv = typeof options?.key === "string" ? parseKeyOrIv(options?.key as string) : options?.key as Buffer | undefined;
  const ivEnv = typeof options?.iv === "string" ? parseKeyOrIv(options?.iv as string) : options?.iv as Buffer | undefined;
  const algorithm = options?.algorithm ?? process.env.AUDIO_CRYPTO_ALGO ?? "aes-256-cbc";

  // Si no hay key/iv, devolvemos el buffer tal cual (no cifrado)
  if (!keyEnv || !ivEnv) return buffer;

  try {
    // Intentamos descifrar; si falla, lanzamos y el caller decidirá fallback
    const decipher = crypto.createDecipheriv(algorithm, keyEnv, ivEnv);
    const decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
    return decrypted;
  } catch (err) {
    // Falló el descifrado => asumimos que no estaba cifrado
    // NOTA: no remuevas este comportamiento si prefieres fallar explícitamente
    return buffer;
  }
}

async function writeTempFile(buffer: Buffer, ext = ".ogg"): Promise<string> {
  const name = `${Date.now()}-${uuidv4()}${ext}`;
  const outPath = path.join(TMP_PUBLIC_DIR, name);
  await fs.writeFile(outPath, buffer);
  return outPath;
}

async function detectAndEnsureExt(buffer: Buffer): Promise<{ ext: string; mime: string }> {
  const info = await fileTypeFromBuffer(buffer);
  if (info) {
    const ext = `.${info.ext}`;
    return { ext, mime: info.mime };
  }
  // fallback: ogg por defecto
  return { ext: ".ogg", mime: "audio/ogg" };
}

async function convertWithFFmpeg(inputPath: string, outputPath: string): Promise<void> {
  // convertir a mp3 16k mono para compatibilidad con modelos de transcripción
  const args = ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", outputPath];
  await execFileAsync("ffmpeg", args);
}

export async function processEncryptedAudioFile(
  inputPath: string,
  options?: {
    key?: string | Buffer;
    iv?: string | Buffer;
    algorithm?: string;
    outputFormat?: "mp3" | "wav";
    exposePublicUrl?: boolean;
    publicBase?: string; // APP_PUBLIC_URL
  }
): Promise<ProcessedAudioResult> {
  // Leer archivo (binario)
  const raw = await fs.readFile(inputPath);

  // Descifrar si corresponde
  const decrypted = await decryptBufferIfNeeded(raw, {
    key: options?.key ?? process.env.AUDIO_CRYPTO_KEY,
    iv: options?.iv ?? process.env.AUDIO_CRYPTO_IV,
    algorithm: options?.algorithm ?? options?.algorithm ?? process.env.AUDIO_CRYPTO_ALGO,
  });

  // Detección de tipo real
  const { ext: detectedExt, mime } = await detectAndEnsureExt(decrypted);

  // Guardar temporalmente el archivo "descifrado"
  const tempDecPath = await writeTempFile(decrypted, detectedExt);

  // Preparar salida
  const outExt = options?.outputFormat === "wav" ? ".wav" : ".mp3";
  const outName = `${Date.now()}-${uuidv4()}${outExt}`;
  const outPath = path.join(TMP_PUBLIC_DIR, outName);

  // Convertir
  await convertWithFFmpeg(tempDecPath, outPath);

  // borrar descifrado temporal
  try { await fs.unlink(tempDecPath); } catch (e) { /* ignore */ }

  // construir public url si se requiere
  let publicUrl: string | undefined = undefined;
  const base = options?.publicBase ?? process.env.APP_PUBLIC_URL;
  if (options?.exposePublicUrl && base) {
    // public folder está en /public, tmp files accesibles en /tmp/...
    // asume que servidor expone /public como /
    const rel = path.basename(outPath);
    publicUrl = `${base.replace(/\/$/, "")}/tmp/${rel}`;
  }

  return { filePath: outPath, publicUrl, mimeType: mime };
}

export async function cleanupFile(filePath: string) {
  try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
}
