import { ensurePolicies } from "./store";

let booting: Promise<void> | null = null;

/** Ensures visibility policies exist. Registration is open to many users. */
export async function ensureBootstrapped() {
  if (!booting) {
    booting = ensurePolicies().catch((error) => {
      booting = null;
      throw error;
    });
  }
  await booting;
}
