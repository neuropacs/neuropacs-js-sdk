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
    - File object success X
    - Uint8Array success X
- upload dataset 
    - dataset Array<File> success X
    - dataset Array<Uint8Array> success X
- run job
    - success X
    - invalid product X
    - invalid order id X
    - invalid connection id X
- check status X
    - success X
    - invalid order id X
    - invalid connection id X
- get results
    - success X
        - TXT X
        - JSON X
        - XML X
    - invalid result format X
    - invalid order id X
    - invalid connection id X
 */

const NeuroPACS = require("../src/neuropacs.module.js");

describe("NeuroPACS Class Tests", () => {
  const serverUrl =
    "http://ec2-3-142-212-32.us-east-2.compute.amazonaws.com:5000"; // Test server URL
  const apiKey = "m0ig54amrl87awtwlizcuji2bxacjm"; //API key for test server

  beforeEach(() => {
    // Create NeuroPACS instance
    npcs = NeuroPACS.init(serverUrl, apiKey);
  });

  // Test 1: get_public_key() - SUCCESS
  test("should successfully retrieve a public key", async function () {
    // Get public key
    const publicKey = await npcs.getPublicKey();

    // TEST
    expect(typeof publicKey).toBe("string");
    const publicKeyPEMRegex =
      /-----BEGIN PUBLIC KEY-----(.|\n)*?-----END PUBLIC KEY-----/;
    expect(publicKeyPEMRegex.test(publicKey)).toBe(true);
  });

  // Test 2: connect() - SUCCESS
  test("should successfully connect to server and return a connection object", async function () {
    // Create connection
    const connection = await npcs.connect();

    const connectionId = connection.connectionId;
    const aesKey = connection.aesKey;

    // TEST
    expect(typeof connectionId).toBe("string");
    expect(connectionId).toHaveLength(32);
    expect(connectionId).toMatch(/^[a-zA-Z0-9]+$/);
    expect(typeof aesKey).toBe("string");
    expect(aesKey).toHaveLength(24);
    expect(aesKey).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  // Test 2: connect() - INVALID API KEY
  test("should fail when connecting to server due to invalid API key", async function () {
    // Invalid API key
    npcs.apiKey = "thisisnotarealapikey12345";

    // TEST
    await expect(npcs.connect()).rejects.toThrow(
      "Failed to connect to the server."
    );
  });

  // Test 3: new_job() - SUCCESS
  test("should successfully create a new job and return an order id", async function () {
    // Create connection
    await npcs.connect();

    // Create job
    const orderId = await npcs.newJob();

    // TEST
    expect(typeof orderId).toBe("string");
    expect(orderId).toHaveLength(20);
    expect(orderId).toMatch(/^[a-zA-Z0-9]+$/);
  });

  // Test 4: new_job() - INVALID CONNECTION ID
  test("should fail when create a new job due to invalid connection id", async function () {
    // Invalid connection id
    npcs.connectionId = "thisisnotarealconnectionid12345";

    // TEST
    await expect(npcs.newJob()).rejects.toThrow("Failed to create a new job.");
  });

  // Test 5: upload() - SUCCESS (File)
  test("should successfully upload a File object to the server", async function () {
    // Create file object
    const fileContents = fs.readFileSync("tests/test_dataset/testdcm");
    const blobData1 = new Blob([fileContents], { type: "text/plain" });
    const file1 = new File([blobData1], "testdcm", {
      type: "text/plain"
    });

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // Upload file
    const upload = await npcs.upload(file1);

    // TEST
    expect(typeof upload).toBe("number");
    expect(upload).toBe(201);
  }, 10000);

  // Test 6: upload() - SUCCESS (Uint8Array)
  test("should successfully upload a Uint8Array to the server", async function () {
    // Create Uint8Array
    const fileContents = fs.readFileSync("tests/test_dataset/testdcm");
    const uint8array = new Uint8Array(fileContents);

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // Upload file
    const upload = await npcs.upload(uint8array);

    // TEST
    expect(typeof upload).toBe("number");
    expect(upload).toBe(201);
  }, 10000);

  // Test 7: uploadDataset() - SUCCESS (File)
  test("should successfully upload a File object dataset to the server", async function () {
    // Create file objects
    const fileContents = fs.readFileSync("tests/test_dataset/testdcm");
    const file1Contents = fs.readFileSync("tests/test_dataset/testdcm1");
    const file2Contents = fs.readFileSync("tests/test_dataset/testdcm2");
    const blobData1 = new Blob([fileContents], { type: "text/plain" });
    const file1 = new File([blobData1], "testdcm", {
      type: "text/plain"
    });
    const blobData2 = new Blob([file1Contents], { type: "text/plain" });
    const file2 = new File([blobData2], "testdcm1", {
      type: "text/plain"
    });
    const blobData3 = new Blob([file2Contents], { type: "text/plain" });
    const file3 = new File([blobData3], "testdcm2", {
      type: "text/plains"
    });

    const testDataset = [file1, file2, file3];

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // Upload dataset
    const upload = await npcs.uploadDataset(testDataset);

    // TEST
    expect(typeof upload).toBe("number");
    expect(upload).toBe(201);
  }, 10000);

  // Test 8: upload() - SUCCESS (Uint8Array)
  test("should successfully upload a Uint8Array dataset to the server", async function () {
    // Create Uint8Arrays
    const fileContents = fs.readFileSync("tests/test_dataset/testdcm");
    const file1Contents = fs.readFileSync("tests/test_dataset/testdcm1");
    const file2Contents = fs.readFileSync("tests/test_dataset/testdcm2");
    const uint8array1 = new Uint8Array(fileContents);
    const uint8array2 = new Uint8Array(file1Contents);
    const uint8array3 = new Uint8Array(file2Contents);

    const testDataset = [uint8array1, uint8array2, uint8array3];

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // Upload dataset
    const upload = await npcs.uploadDataset(testDataset);

    // TEST
    expect(typeof upload).toBe("number");
    expect(upload).toBe(201);
  }, 10000);

  // Test 9: runJob() - SUCCESS
  test("should successfully upload a Uint8Array to the server", async function () {
    const productID = "PD/MSA/PSP-v1.0";

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // Run job
    const job = await npcs.runJob(productID);

    // TEST
    expect(typeof job).toBe("number");
    expect(job).toBe(202);
  });

  // Test 10: runJob() - INVALID PRODUCT ID
  test("should fail due to invalid product ID", async function () {
    const productID = "notARealProduct";

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // TEST
    await expect(npcs.runJob(productID)).rejects.toThrow(
      "Failed to run the job."
    );
  });

  // Test 11: runJob() - INVALID ORDER ID
  test("should fail due to invalid order ID", async function () {
    const productID = "PD/MSA/PSP-v1.0";

    // Create connection
    await npcs.connect();

    // Create job
    npcs.orderId = "notARealOrderID";

    // TEST
    await expect(npcs.runJob(productID)).rejects.toThrow(
      "Failed to run the job."
    );
  });

  // Test 12: runJob() - INVALID CONNECTION ID
  test("should fail due to invalid connection ID", async function () {
    const productID = "PD/MSA/PSP-v1.0";

    // Create connection
    await npcs.connect();

    // Create job
    await npcs.newJob();

    // Invalid ConnectionId
    npcs.connectionId = "notARealConnectionID";

    // TEST
    await expect(npcs.runJob(productID)).rejects.toThrow(
      "Failed to run the job."
    );
  });

  // Test 13: checkStatus() - SUCCESS
  test("should successfully upload a Uint8Array to the server", async function () {
    // Create connection
    await npcs.connect();

    // Check status
    const status = await npcs.checkStatus("TEST");

    // TEST
    const expectedResult = {
      started: true,
      finished: true,
      failed: false,
      progress: 100,
      info: "Finished"
    };
    expect(typeof status).toBe("object");
    expect(JSON.stringify(status)).toBe(JSON.stringify(expectedResult));
  });

  // Test 14: checkStatus() - INVALID ORDER ID
  test("should fail due to invalid order id", async function () {
    // Create connection
    await npcs.connect();

    // TEST
    await expect(npcs.checkStatus("INVALID")).rejects.toThrow(
      "Failed to check status."
    );
  });

  // Test 15: checkStatus() - INVALID CONNECTION ID
  test("should fail due to invalid order id", async function () {
    // Create connection
    await npcs.connect();

    // Create connection
    npcs.connectionId = "invalidConnectionID";

    // TEST
    await expect(npcs.checkStatus("TEST")).rejects.toThrow(
      "Failed to check status."
    );
  });

  // Test 16: getResults() - SUCCESS (TXT)
  test("should successfully retrieve results in TXT format", async function () {
    const resultType = "TXT";

    // Create connection
    await npcs.connect();

    // Check status
    const results = await npcs.getResults(resultType, "TEST");

    // TEST
    const currentDate = new Date();
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getUTCDate()).padStart(2, "0");

    const formattedUTCDate = `${year}-${month}-${day}`;

    const expectedResult = `Order ID: TEST
    Date: ${formattedUTCDate}
    Product: TEST
    PD probability vs. MSA/PSP: 62.6%
    MSA probability vs. PSP: 85.6%
    Biomarker levels: pSN=0.26, Putamen=0.19, SCP=0.48, MCP=0.07`;
    expect(typeof results).toBe("string");
    expect(results.replace(/\s/g, "")).toBe(expectedResult.replace(/\s/g, ""));
  });

  // Test 17: getResults() - SUCCESS (JSON)
  test("should successfully retrieve results in JSON format", async function () {
    const resultType = "JSON";

    // Create connection
    await npcs.connect();

    // Check status
    const results = await npcs.getResults(resultType, "TEST");

    // TEST
    const currentDate = new Date();
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getUTCDate()).padStart(2, "0");

    const formattedUTCDate = `${year}-${month}-${day}`;

    const expectedResult = {
      orderID: "TEST",
      date: formattedUTCDate,
      product: "TEST",
      result: {
        PDprobability: "62.6",
        MSAprobability: "85.6",
        FWpSN: "0.26",
        FWPutamen: "0.19",
        FWSCP: "0.48",
        FWMCP: "0.07"
      }
    };
    expect(typeof results).toBe("string");
    expect(results.replace(/\s/g, "")).toBe(
      JSON.stringify(expectedResult).replace(/\s/g, "")
    );
  });

  // Test 18: getResults() - SUCCESS (XML)
  test("should successfully retrieve results in XML format", async function () {
    const resultType = "XML";

    // Create connection
    await npcs.connect();

    // Check status
    const results = await npcs.getResults(resultType, "TEST");

    // TEST
    const currentDate = new Date();
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getUTCDate()).padStart(2, "0");

    const formattedUTCDate = `${year}-${month}-${day}`;
    const expectedResult = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <neuropacs orderID="TEST" date="${formattedUTCDate}" product="TEST">
      <result name="PDprobability" value="62.6"/>
      <result name="MSAprobability" value="85.6"/>
      <data name="FWpSN" value="0.26"/>
      <data name="FWPutamen" value="0.19"/>
      <data name="FWSCP" value="0.48"/>
      <data name="FWMCP" value="0.07"/>
    </neuropacs>`;
    expect(typeof results).toBe("string");
    expect(results.replace(/\s/g, "")).toBe(expectedResult.replace(/\s/g, ""));
  });

  // Test 19: getResults() - INVALID RESULT FOMAT
  test("should fail due to invalid result format", async function () {
    const resultType = "NOTREAL";

    // Generate an AES key
    const aesKey = npcs.generateAesKey();

    // Create connection
    const connectionId = await npcs.connect(apiKey, aesKey);

    // TEST
    await expect(
      npcs.getResults(resultType, "TEST", connectionId, aesKey)
    ).rejects.toThrow("Failed to retrieve results.");
  });

  // Test 10: getResults() - INVALID ORDER ID
  test("should fail due to invalid order id", async function () {
    const resultType = "TXT";

    // Create connection
    await npcs.connect();

    // TEST
    await expect(npcs.getResults(resultType, "INVALID")).rejects.toThrow(
      "Failed to retrieve results."
    );
  });

  // Test 21: getResults() - INVALID CONNECTION ID
  test("should fail due to invalid order id", async function () {
    const resultType = "TXT";

    // Create connection
    await npcs.connect();

    // Invalid connectionId
    npcs.connectionId = "notARealConnectionID";

    // TEST
    await expect(npcs.getResults(resultType, "TEST")).rejects.toThrow(
      "Failed to retrieve results."
    );
  });
});
