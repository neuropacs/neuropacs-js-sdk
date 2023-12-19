/*!
 * NeuroPACS v1.0.0
 * (c) 2023 Kerrick Cavanaugh
 * Released under the MIT License.
 */

class Neuropacs {
  /**
   * Constructor
   * @param {String} apiKey API key for server
   * @param {String} serverUrl Server URL for an instance
   */
  constructor(apiKey, serverUrl) {
    this.apiKey = apiKey;
    this.serverUrl = serverUrl;
    this.ackRecieved = false;
    this.datasetUpload = false;
  }

  /**
   * Load socketio CDN
   * @param {String} src Source file of socket.io.min.js
   * @param {Function} callback
   */
  loadSocketIOCdn(src, callback) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  }

  /**
   * Close connection with socket
   */
  disconnectFromSocket() {
    this.socket.close(false);
    console.log("Disconnected from upload socket.");
  }

  /**
   * Connect to socket
   */
  connectToSocket() {
    this.socket.connect();
  }

  /**
   * Upload a dataset to the socket
   * @param {Array<File>/Array<Uint8Array>} dataset
   * @param {String} orderId Base64 order_id.
   * @param {String} connectionId Base64 connection_id.
   * @param {String} aesKey Base64 AES key.
   * @returns {Number} Upload completion status
   */
  async uploadDataset(dataset, orderId, connectionId, aesKey) {
    await this.initSocketIO();

    this.datasetUpload = true;

    this.connectToSocket();

    const totalFiles = dataset.length;

    for (let i = 0; i < totalFiles; i++) {
      const curData = dataset[i];
      await this.upload(curData, orderId, connectionId, aesKey);
      this.printProgressBar(i + 1, totalFiles);
    }

    this.disconnectFromSocket();

    return 201;
  }

  /**
   * Print progress bar for dataset upload
   * @param {*} current Current progress
   * @param {*} total Total files to be uploaded
   * @param {*} length Length of progress bar
   */
  printProgressBar(current, total, length = 50) {
    const progress = (current / total) * 100;
    const progressBar =
      Array(Math.floor((current / total) * length))
        .fill("=")
        .join("") +
      Array(length - Math.floor((current / total) * length))
        .fill(".")
        .join("");

    console.clear();
    console.log(`[${progressBar}] ${progress.toFixed(2)}%`);
  }

  /**
   * Upload a file to the socket
   * @param {Uint8Array/File} data Data to be uploaded
   * @param {String} orderID Base64 orderID.
   * @param {String} connectionID Base64 connection_id.
   * @param {String} aesKey Base64 AES key.
   * @returns {Number} Upload status code.
   */
  async upload(data, orderID, connectionID, aesKey) {
    this.ackReceived = false;

    if (!this.datasetUpload) {
      this.connectToSocket();
    }

    let filename = "";

    if (data instanceof Uint8Array) {
      filename = this.generateFilename();
    } else if (data instanceof File) {
      // Assuming 'data' is a File object or a string representing a file path
      const file = data instanceof File ? data : await this.readFile(data);
      filename = file.name;
    } else {
      throw new Error("Unsupported data type!");
    }

    const form = {
      "Content-Disposition": "form-data",
      filename: filename,
      name: "test123"
    };

    const BOUNDARY = "neuropacs----------";
    const DELIM = ";";
    const CRLF = "\r\n";
    const SEPARATOR = `--${BOUNDARY}${CRLF}`;
    const END = `--${BOUNDARY}--${CRLF}`;
    const CONTENT_TYPE = "Content-Type: application/octet-stream";

    let header = SEPARATOR;
    for (const [key, value] of Object.entries(form)) {
      header += `${key}: ${value}${DELIM}`;
    }
    header += CRLF;
    header += CONTENT_TYPE;
    header += `${CRLF}${CRLF}`;

    const headerBytes = new TextEncoder().encode(header);

    const encryptedOrderID = await this.encryptAesCtr(
      orderID,
      aesKey,
      "string",
      "string"
    );

    let encryptedBinaryData;

    if (data instanceof Uint8Array) {
      encryptedBinaryData = this.encryptAesCtr(
        data,
        aesKey,
        "Uint8Array",
        "bytes"
      );
    } else if (data instanceof File) {
      const binaryData = await this.readFileAsArrayBuffer(data);
      encryptedBinaryData = await this.encryptAesCtr(
        new Uint8Array(binaryData),
        aesKey,
        "Uint8Array",
        "bytes"
      );
    } else {
      throw new Error("Unsupported data type!");
    }

    const message = new Uint8Array([
      ...headerBytes,
      ...encryptedBinaryData,
      ...new TextEncoder().encode(END)
    ]);

    const headers = {
      "Content-Type": "application/octet-stream",
      "connection-id": connectionID,
      client: "API",
      "order-id": encryptedOrderID
    };

    this.socket.emit("file_data", { data: message, headers: headers });

    const maxAckWaitTime = 10; // 10 seconds
    const startTime = Date.now();
    let elapsed_time = 0;

    // Equivalent to the Python while loop
    while (!this.ackReceived && elapsed_time < maxAckWaitTime) {
      elapsed_time = (Date.now() - startTime) / 1000; // Convert to seconds
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Check if the maximum wait time has been reached
    if (elapsed_time > maxAckWaitTime) {
      this.disconnectFromSocket();
      throw new Error("Upload timeout!");
    }

    if (!this.datasetUpload) {
      this.disconnectFromSocket();
    }

    return 201; // Upload success status code
  }

  generateFilename() {
    // Simulate generating a filename for bytes data
    return "generated_filename";
  }

  async readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Initialize SocketIO from source file
   */
  initSocketIOFromCDN(resolve) {
    this.loadSocketIOCdn(
      "https://neuropacs.com/js/lib/socket.io.min.js",
      () => {
        this.socket = io(this.serverUrl, {
          autoConnect: false,
          transports: ["websocket"]
        });

        this.socket.on("connect", () => {
          console.log("Connected to upload socket!");
        });

        this.socket.on("ack", (data) => {
          console.log(`ACK RECV: ${data}`);
          if (data == "0") {
            this.ackReceived = true;
          } else {
            this.disconnectFromSocket();
          }
        });

        this.socket.on("error", (error) => {
          console.error("Socket.IO error:", error);
        });
        resolve();
      }
    );
  }

  /**
   * Initialize SocketIO
   */
  initSocketIO() {
    return new Promise(async (resolve) => {
      try {
        this.socket = io(this.serverUrl, {
          autoConnect: false,
          transports: ["websocket"]
        });

        this.socket.on("connect", () => {
          console.log("Connected to upload socket!");
        });

        this.socket.on("ack", (data) => {
          if (data == "0") {
            this.ackReceived = true;
          } else {
            this.disconnectFromSocket();
          }
        });

        this.socket.on("error", (error) => {
          console.error("Socket.IO error:", error);
        });
        resolve();
      } catch (e) {
        this.initSocketIOFromCDN(resolve);
      }
    });
  }

  /**
   * Generate an 16-byte AES key for AES-CTR encryption.
   * @returns AES key encoded as a base64 string.
   */
  generateAesKey() {
    const aesKey = new Uint8Array(16);
    window.crypto.getRandomValues(aesKey);
    const aesKeyBase64 = btoa(String.fromCharCode.apply(null, aesKey));
    return aesKeyBase64;
  }

  /**
   * OAEP encrypt plaintext.
   * @param {String/JSON} plaintext Plaintext to be encrypted.
   * @returns {String} Base64 string OAEP encrypted ciphertext
   */
  async oaepEncrypt(plaintext) {
    try {
      plaintext = JSON.stringify(plaintext);
    } catch (error) {
      if (typeof plaintext !== "string") {
        throw new Error("Plaintext must be a string or JSON!");
      }
    }

    const publicKey = await getPublicKey();

    const publicKeyBuffer = new TextEncoder().encode(publicKey);
    const publicKeyArrayBuffer = publicKeyBuffer.buffer;

    const importedPublicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyArrayBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    const plaintextBuffer = new TextEncoder().encode(plaintext);
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      importedPublicKey,
      plaintextBuffer
    );

    const ciphertextArray = Array.from(new Uint8Array(ciphertextBuffer));
    const ciphertextBase64 = btoa(String.fromCharCode(...ciphertextArray));

    return ciphertextBase64;
  }

  /**
   * Create a connection with the server
   * @param {String} apiKey Base64 API key.
   * @param {String} aesKey Base64 AES key.
   * @returns {String} Base64 string encrypted AES key.
   */
  async connect(apiKey, aesKey) {
    const headers = {
      "Content-Type": "text/plain",
      client: "api"
    };

    const body = {
      aes_key: aesKey, // Assuming aesKey is defined
      api_key: apiKey // Assuming apiKey is defined
    };

    const encryptedBody = await this.oaepEncrypt(body); // Assuming oaepEncrypt is defined

    try {
      const response = await fetch(`${this.serverUrl}/connect/`, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (response.ok) {
        const json = await response.json();
        const connectionId = json.connectionID;
        return connectionId;
      } else {
        throw new Error(`Connection failed! Status: ${response.status}`);
      }
    } catch (error) {
      throw new Error("Failed to connect to the server.");
    }
  }

  /**
   * Retrieve public key from server.
   * @returns {String} Base64 string public key.
   */
  async getPublicKey() {
    try {
      const response = await fetch(`${this.serverUrl}/getPubKey/`);

      if (response.ok) {
        const json = await response.json();
        const pubKey = json.pub_key;
        return pubKey;
      } else {
        throw new Error(
          `Public key retrieval failed! Status: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error("Failed to retrieve the public key.");
    }
  }

  /**
   * Create a new order
   * @param {String} connectionId Base64 connection ID.
   * @param {String} aesKey Base64 AES key.
   * @returns {String} Base64 string orderID.
   */
  async newJob(connectionId, aesKey) {
    try {
      const url = `${this.serverUrl}/newJob/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": connectionId,
        Client: "API"
      };

      const response = await fetch(url, {
        method: "POST",
        headers: headers
      });

      if (response.status === 201) {
        const text = await response.text();
        const decryptedText = this.decryptAesCtr(text, aesKey, "string");
        return decryptedText;
      } else {
        throw new Error(`Job creation returned status ${response.status}.`);
      }
    } catch (error) {
      throw new Error("Failed to create a new job.");
    }
  }

  /**
   * Run a job
   * @param {String} productId Product to be executed.
   * @param {String} orderId Base64 order ID.
   * @param {String} connectionId Base64 connection ID.
   * @param {String} aesKey Base64 AES key.
   * @returns {Number} Job run status code.
   */
  async runJob(productId, orderId, connectionId, aesKey) {
    try {
      const url = `${this.serverUrl}/runJob/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": connectionId,
        Client: "API"
      };

      const body = {
        orderID: orderId,
        productID: productId
      };

      const encryptedBody = await this.encryptAesCtr(
        body,
        aesKey,
        "JSON",
        "string"
      );

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (response.status === 202) {
        return response.status;
      } else {
        throw new Error("Job run failed.");
      }
    } catch (error) {
      console.log(error);
      throw new Error("Failed to run the job.");
    }
  }

  /**
   * Check job status
   * @param {String} orderId Base64 order_id.
   * @param {String} connectionId Base64 connection_id.
   * @param {String} aesKey Base64 AES key.
   * @returns {Number} Job status message.
   */
  async checkStatus(orderId, connectionId, aesKey) {
    try {
      const url = `${this.serverUrl}/checkStatus/`;
      const headers = {
        "Content-Type": "text/plain",
        "connection-id": connectionId,
        client: "api"
      };

      const body = {
        orderID: orderId
      };

      const encryptedBody = await this.encryptAesCtr(
        body,
        aesKey,
        "JSON",
        "string"
      );

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (response.status === 200) {
        const text = await response.text();
        const json = await this.decryptAesCtr(text, aesKey, "JSON");
        return json;
      } else {
        throw new Error("Status check failed.");
      }
    } catch (error) {
      throw new Error("Failed to check status.");
    }
  }

  /**
   * Get job results
   * @param {String} format Base64 AES key.
   * @param {String} orderId Base64 connection_id.
   * @param {String} connectionId Format of file data
   * @param {String} aesKey Base64 orderID.
   * @returns  AES encrypted file data in specified format
   */
  async getResults(format, orderId, connectionId, aesKey) {
    try {
      const url = `${this.serverUrl}/getResults/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": connectionId,
        Client: "api"
      };

      const validFormats = ["TXT", "XML", "JSON", "DICOMSR", "PDF"];

      if (!validFormats.includes(format)) {
        throw new Error(
          "Invalid format! Valid formats include: 'TXT', 'JSON', 'XML', 'PDF', 'DICOMSR'."
        );
      }

      const body = {
        orderID: orderId,
        format: format
      };

      const encryptedBody = this.encryptAesCtr(body, aesKey, "JSON", "string");

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (response.status === 200) {
        const text = await response.text();
        const decryptedFileData = this.decryptAesCtr(text, aesKey, "string");
        return decryptedFileData;
      } else {
        throw new Error("Result retrieval failed!");
      }
    } catch (error) {
      throw new Error("Failed to retrieve results.");
    }
  }

  /**
   * OAEP encrypt plaintext.
   * @param {String/JSON} plaintext Plaintext to be encrypted.
   * @returns Base64 string OAEP encrypted ciphertext.
   */
  async oaepEncrypt(plaintext) {
    try {
      // If plaintext is not a string, attempt to convert it to JSON
      plaintext =
        typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext);
    } catch (error) {
      throw new Error("Plaintext must be a string or JSON!");
    }

    const publicKey = await this.getPublicKey();

    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = publicKey.substring(
      pemHeader.length,
      publicKey.length - pemFooter.length - 1
    );
    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const publicKeyBuffer = this.str2ab(binaryDerString);

    // Convert the public key to ArrayBuffer
    // const publicKeyBuffer = new TextEncoder().encode(publicKey);
    const publicKeyObject = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
    // Encrypt the plaintext using OAEP padding
    const ciphertextArrayBuffer = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKeyObject,
      new TextEncoder().encode(plaintext)
    );

    // Convert the ciphertext to Base64
    const ciphertextBase64 = this.arrayBufferToBase64(ciphertextArrayBuffer);
    return ciphertextBase64;
  }

  /**
   * String to array buffer
   * @param {*} str String to be converted
   * @returns Array buffer
   */
  str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  /**
   * Convert array buffer to Base64
   * @param {ArrayBuffer} buffer Array buffer to be converted
   * @returns Base64 representation
   */
  arrayBufferToBase64(buffer) {
    const binary = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, binary));
  }

  /**
   * AES CTR encrypt plaintext
   * @param {JSON/String/Bytes} plaintext Plaintext to be encrypted.
   * @param {String} aesKey Base64 AES key.
   * @param {String} formatOut format of ciphertext. Defaults to "string".
   * @returns {String} Encrypted ciphertext in requested format_out.
   */
  async encryptAesCtr(plaintext, aesKey, formatIn, formatOut) {
    let plaintextBytes;

    try {
      if (formatIn == "string" && typeof plaintext === "string") {
        plaintextBytes = new TextEncoder().encode(plaintext);
      } else if (formatIn == "JSON") {
        const plaintextJson = JSON.stringify(plaintext);
        plaintextBytes = new TextEncoder().encode(plaintextJson);
      } else if (formatIn == "Uint8Array" && plaintext instanceof Uint8Array) {
        plaintextBytes = plaintext;
      } else {
        throw new Error("Invalid plaintext format!");
      }
    } catch (e) {
      throw new Error("Invalid plaintext format!");
    }

    try {
      // Decode the base64-encoded AES key
      const aesKeyBytes = new Uint8Array(
        atob(aesKey)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Pad the plaintext
      const paddedPlaintext = await this.pad(plaintextBytes, 16);

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(16));

      // Import AES key
      const importedKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBytes,
        { name: "AES-CTR" },
        false,
        ["encrypt"]
      );

      // Encrypt the plaintext using AES in CTR mode
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-CTR",
          counter: iv,
          length: 128
        },
        importedKey,
        paddedPlaintext
      );

      // Combine IV and ciphertext
      const encryptedData = new Uint8Array(iv.length + ciphertext.byteLength);
      encryptedData.set(iv);
      encryptedData.set(new Uint8Array(ciphertext), iv.length);

      // Convert to base64 if the output format is 'string'
      if (formatOut === "string") {
        return btoa(String.fromCharCode.apply(null, encryptedData));
      } else if (formatOut === "bytes") {
        return encryptedData;
      }
    } catch (error) {
      throw new Error("AES encryption failed!");
    }
  }

  /**
   * Padding for AES CTR
   * @param {*} data data to be padded
   * @param {*} blockSize block size of cipher
   * @returns  padded data
   */
  async pad(data, blockSize) {
    const padding = blockSize - (data.length % blockSize);
    const paddedData = new Uint8Array(data.length + padding);
    paddedData.set(data);
    return paddedData;
  }

  async decryptAesCtr(encryptedData, aesKey, formatOut) {
    try {
      // Decode the base64-encoded AES key
      const aesKeyBytes = new Uint8Array(
        atob(aesKey)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Convert the base64-encoded encrypted data to Uint8Array
      const encryptedBytes = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Extract IV and ciphertext
      const iv = encryptedBytes.slice(0, 16);
      const ciphertext = encryptedBytes.slice(16);

      // Import AES key
      const importedKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBytes,
        { name: "AES-CTR" },
        false,
        ["decrypt"]
      );

      // Decrypt the ciphertext using AES in CTR mode
      const decryptedBytes = await crypto.subtle.decrypt(
        {
          name: "AES-CTR",
          counter: iv,
          length: 128
        },
        importedKey,
        ciphertext
      );

      // Convert the decrypted result to a string
      let decryptedText = new TextDecoder().decode(decryptedBytes);

      // Handle the output format
      if (formatOut === "JSON") {
        decryptedText = decryptedText.trim();
        return JSON.parse(decryptedText);
      } else if (formatOut === "string") {
        return decryptedText;
      }
    } catch (error) {
      throw new Error("AES decryption failed!");
    }
  }
}
