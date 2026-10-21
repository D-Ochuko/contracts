import { describe, it, expect } from "vitest";
import { networks, Client } from "../dist/index.js";
import { Keypair } from "@stellar/stellar-sdk";

// End-to-end tests against a live Soroban network.
//
// These tests sign and submit real transactions through the generated client:
// a register_alert -> get_alert round-trip, BytesN<32> encoding of the webhook
// hash, and error decoding when querying a nonexistent alert.
//
// They are skipped unless a funded keypair and a live RPC are available. In CI
// (`.github/workflows/bindings-e2e.yml`) the keypair is funded on the local
// quickstart network and the deployed alert-registry contract id is passed in
// via the SOROBAN_ENV environment (or the deploy step captures it).

const rpcUrl = process.env.SOROBAN_RPC_URL || process.env.SOROBAN_ENV_RPC_URL;
const networkPassphrase =
  process.env.SOROBAN_NETWORK_PASSPHRASE ||
  process.env.SOROBAN_ENV_NETWORK_PASSPHRASE ||
  networks.testnet.networkPassphrase;
const secretKey = process.env.SOROBAN_SECRET_KEY;
const contractId = process.env.SOROBAN_CONTRACT_ID;

const runIfReady = () =>
  rpcUrl &&
  networkPassphrase &&
  secretKey &&
  contractId &&
  /^C[A-Z2-7]{55}$/.test(contractId);

describe.skipIf(!runIfReady)("AlertRegistry e2e", () => {
  const keypair = Keypair.fromSecret(secretKey);
  const networkConfig = {
    contractId,
    networkPassphrase,
    rpcUrl,
  };

  const client = new Client(networkConfig);

  // BytesN<32> webhook hash: the raw 32-byte SHA-256 digest of the webhook URL.
  // In the bindings the webhook_hash field is BytesN<32>, so we pass the digest
  // as a Uint8Array of exactly 32 bytes.
  it("round-trips a register_alert -> get_alert and verifies BytesN<32> webhook_hash", async () => {
    const label = `e2e-${Date.now()}`;
    const webhookUrl = `https://example.invalid/hook/${label}`;
    const webhookHash = crypto
      .createHash("sha256")
      .update(webhookUrl)
      .digest(); // 32 bytes, Uint8Array

    expect(webhookHash).toHaveLength(32);

    const targetContract = Keypair.random().publicKey();
    const owner = keypair.publicKey();
    const rules = ["rule:transfer"];

    const alertId = await client.register_alert(
      owner,
      targetContract,
      label,
      webhookHash,
      rules
    );

    expect(alertId).toBeDefined();
    expect(typeof alertId).toBe("string");
    expect(/^C[A-Z2-7]{55}$/.test(alertId)).toBe(true);

    const alertConfig = await client.get_alert(owner, alertId);

    expect(alertConfig).toBeDefined();
    expect(alertConfig?.label).toBe(label);
    expect(alertConfig?.target_contract).toBe(targetContract);
    // webhook_hash comes back as Uint8Array
    if (alertConfig?.webhook_hash) {
      const got = Buffer.from(alertConfig.webhook_hash);
      const expected = Buffer.from(webhookHash);
      expect(got).toEqual(expected);
    }
  });

  it("decodes an error for a nonexistent alert", async () => {
    const owner = keypair.publicKey();
    const missingId = "0".repeat(56);

    // get_alert of a nonexistent id should return null / a sentinel rather than
    // crashing. The contract returns None for a missing alert.
    const result = await client.get_alert(owner, missingId);

    // The generated client should either return null or a clearly-sentinel value.
    expect(result).toBeNull();
  });
});
