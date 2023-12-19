/**
- invalid server url
- generate aes key
    - success X
- get public key
    - success X
- connect 
    - success X
    - invalid api key X
- new job 
    - success X
    - invalid connection id X
- upload 
    - File object success 
    - Uint8Array success 
- upload dataset 
    - dataset path success 
- run job
    - success
    - invalid product 
    - invalid order id 
    - invalid connection id 
- check status
    - success 
    - invalid order id 
    - invalid connection id 
- get results
    - success 
        - TXT 
        - JSON 
        - XML 
    - invalid result format 
    - invalid order id 
    - invalid connection id
 */
const NeuroPACS = require("../src/neuropacs.module.js");

describe("NeuroPACS Class Tests", () => {
  const serverUrl =
    "http://ec2-3-142-212-32.us-east-2.compute.amazonaws.com:5000"; // Test server URL
  const apiKey = "m0ig54amrl87awtwlizcuji2bxacjm"; //API key for test server

  beforeEach(() => {
    // Create NeuroPACS instance
    npcs = new NeuroPACS(apiKey, serverUrl);
  });

  //  Test 1: generate_aes_key() - Success
  test("should successfully generate an AES key", function () {
    // Generate AES key
    const aesKey = npcs.generateAesKey();

    // TEST
    expect(typeof aesKey).toBe("string");
    expect(aesKey.length).toBe(24);
    const aesKeyRegex = /^[A-Za-z0-9+/]{22}==$/;
    expect(aesKey).toMatch(aesKeyRegex);
  });

  // Test 2: get_public_key()
  test("should successfully retrieve a public key", async function () {
    // Get public key
    const publicKey = await npcs.getPublicKey();

    // TEST
    expect(typeof publicKey).toBe("string");
    const publicKeyPEMRegex =
      /-----BEGIN PUBLIC KEY-----(.|\n)*?-----END PUBLIC KEY-----/;
    expect(publicKeyPEMRegex.test(publicKey)).toBe(true);
  });

  // Test 3: connect() - SUCCESS
  test("should successfully connect to server and return a connection id", async function () {
    // Generate an AES key
    const aesKey = npcs.generateAesKey();

    // Create connection
    const connectionId = await npcs.connect(apiKey, aesKey);

    // TEST
    expect(typeof connectionId).toBe("string");
    expect(connectionId).toHaveLength(32);
    expect(connectionId).toMatch(/^[a-zA-Z0-9]+$/);
  });

  // Test 4: connect() - INVALID API KEY
  test("should fail when connecting to server due to invalid API key", async function () {
    // Generate an AES key
    const aesKey = npcs.generateAesKey();

    // Invalid API key
    const invalidApiKey = "thisisnotarealapikey12345";

    // TEST
    await expect(npcs.connect(invalidApiKey, aesKey)).rejects.toThrow(
      "Failed to connect to the server."
    );
  });

  // Test 5: new_job() - SUCCESS
  test("should successfully create a new job and return an order id", async function () {
    // Generate an AES key
    const aesKey = npcs.generateAesKey();

    // Create connection
    const connectionId = await npcs.connect(apiKey, aesKey);

    // Create job
    const orderId = await npcs.newJob(connectionId, aesKey);

    // TEST
    expect(typeof orderId).toBe("string");
    expect(orderId).toHaveLength(20);
    expect(orderId).toMatch(/^[a-zA-Z0-9]+$/);
  });

  // Test 6: new_job() - INVALID CONNECTION ID
  test("should fail when create a new job due to invalid connection id", async function () {
    // Generate an AES key
    const aesKey = npcs.generateAesKey();

    // Invalid connection id
    const invalidConnectionId = "thisisnotarealconnectionid12345";

    // TEST
    await expect(npcs.newJob(invalidConnectionId, aesKey)).rejects.toThrow(
      "Failed to create a new job."
    );
  });

  // Test 7: upload() - SUCCESS (path)
  // test("should successfully upload a file to the server", async function () {});
});
