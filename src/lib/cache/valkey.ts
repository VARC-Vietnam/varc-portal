import { createClient, type RedisClientType } from "redis";
import { logServerError } from "@/lib/safe-error";

type GlobalValkey = typeof globalThis & {
  __varcValkey?: RedisClientType;
  __varcValkeyConnecting?: Promise<RedisClientType | null>;
};

const globalForValkey = globalThis as GlobalValkey;

function valkeyUrl(): string | undefined {
  const raw = process.env.VALKEY_URL?.trim() || process.env.REDIS_URL?.trim();
  return raw || undefined;
}

function valkeyPassword(): string | undefined {
  const raw = process.env.VALKEY_PASSWORD?.trim();
  return raw || undefined;
}

/**
 * Shared Valkey/Redis client. Returns null when unset or unreachable (fail-open).
 * Auth: optional VALKEY_PASSWORD (used with requirepass in k8s).
 */
export async function getValkey(): Promise<RedisClientType | null> {
  const url = valkeyUrl();
  if (!url) return null;

  if (globalForValkey.__varcValkey?.isOpen) {
    return globalForValkey.__varcValkey;
  }

  if (!globalForValkey.__varcValkeyConnecting) {
    globalForValkey.__varcValkeyConnecting = (async () => {
      try {
        const password = valkeyPassword();
        const client = createClient({
          url,
          ...(password ? { password } : {}),
        }) as RedisClientType;
        client.on("error", (err) => {
          logServerError("valkey client", err);
        });
        await client.connect();
        globalForValkey.__varcValkey = client;
        return client;
      } catch (error) {
        logServerError("valkey connect", error);
        return null;
      } finally {
        globalForValkey.__varcValkeyConnecting = undefined;
      }
    })();
  }

  return globalForValkey.__varcValkeyConnecting;
}

export async function pingValkey(): Promise<"ok" | "skip" | "error"> {
  if (!valkeyUrl()) return "skip";
  try {
    const client = await getValkey();
    if (!client) return "error";
    const pong = await client.ping();
    return pong === "PONG" ? "ok" : "error";
  } catch (error) {
    logServerError("valkey ping", error);
    return "error";
  }
}
