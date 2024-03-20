/*!
 * NeuroPACS v1.0.0
 * (c) 2024 Kerrick Cavanaugh
 * Released under the MIT License.
 */

class Neuropacs {
  /**
   * Constructor
   * @param {String} apiKey API key for server
   * @param {String} serverUrl Server URL for an instance
   * @param {String} client ClientID (default = "api")
   */
  constructor(serverUrl, apiKey, client = "api") {
    /* PRIVATE METHODS (CLOSURES) */

    /**
     * Read in a file as an ArrayBuffer Object
     * @param {File} file File to be read
     * @returns ArrayBuffer contents of file
     */
    this.readFileAsArrayBuffer = async (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    };

    /**
     * Print progress bar for dataset upload
     * @param {*} current Current progress
     * @param {*} total Total files to be uploaded
     * @param {*} length Length of progress bar
     */
    this.printProgressBar = (current, total, length = 50) => {
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
    };

    /**
     * Generate a random file name
     * @returns 20 character random alphanumeric
     */
    this.generateFilename = () => {
      const charset =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 20; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset.charAt(randomIndex);
      }
      return result;
    };

    /**
     * Genereate unique ID for socket messages
     */
    this.generateUniqueId = () => {
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    };

    /**
     * Generate an 16-byte AES key for AES-CTR encryption.
     * @returns AES key encoded as a base64 string.
     */
    this.generateAesKey = () => {
      const aesKey = new Uint8Array(16);
      window.crypto.getRandomValues(aesKey);
      const aesKeyBase64 = btoa(String.fromCharCode.apply(null, aesKey));
      return aesKeyBase64;
    };

    /**
     * OAEP encrypt plaintext.
     * @param {String/JSON} plaintext Plaintext to be encrypted.
     * @returns Base64 string OAEP encrypted ciphertext.
     */
    this.oaepEncrypt = async (plaintext) => {
      try {
        // If plaintext is not a string, attempt to convert it to JSON
        plaintext =
          typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext);
      } catch (error) {
        throw { neuropacsError: "Plaintext must be a string or JSON!" };
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
    };

    /**
     * Retrieve public key from server.
     * @returns {String} Base64 string public key.
     */
    this.getPublicKey = async () => {
      try {
        const response = await fetch(`${this.serverUrl}/api/getPubKey/`);

        if (!response.ok) {
          throw { neuropacsError: `${await response.text()}` };
        }

        const json = await response.json();
        const pubKey = json.pub_key;
        return pubKey;
      } catch (error) {
        if (error.neuropacsError) {
          throw new Error(error.neuropacsError);
        } else {
          throw new Error("Failed to retrieve the public key.");
        }
      }
    };

    /**
     * String to array buffer
     * @param {*} str String to be converted
     * @returns Array buffer
     */
    this.str2ab = (str) => {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    };

    /**
     * Convert array buffer to Base64
     * @param {ArrayBuffer} buffer Array buffer to be converted
     * @returns Base64 representation
     */
    this.arrayBufferToBase64 = (buffer) => {
      const binary = new Uint8Array(buffer);
      return btoa(String.fromCharCode.apply(null, binary));
    };

    /**
     * AES CTR encrypt plaintext
     * @param {JSON/String/Bytes} plaintext Plaintext to be encrypted.
     * @param {String} aesKey Base64 AES key.
     * @param {String} formatOut format of ciphertext. Defaults to "string".
     * @returns {String} Encrypted ciphertext in requested format_out.
     */
    this.encryptAesCtr = async (plaintext, aesKey, formatIn, formatOut) => {
      let plaintextBytes;

      try {
        if (formatIn == "string" && typeof plaintext === "string") {
          plaintextBytes = new TextEncoder().encode(plaintext);
        } else if (formatIn == "JSON") {
          const plaintextJson = JSON.stringify(plaintext);
          plaintextBytes = new TextEncoder().encode(plaintextJson);
        } else if (
          formatIn == "Uint8Array" &&
          plaintext instanceof Uint8Array
        ) {
          plaintextBytes = plaintext;
        } else {
          throw new Error("Invalid plaintext format!");
        }
      } catch (e) {
        if (error) {
          throw new Error(error);
        } else {
          throw new Error("Plaintext decoding failed!");
        }
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
        if (error) {
          throw new Error(error);
        } else {
          throw new Error("AES encryption failed!");
        }
      }
    };

    /**
     * Padding for AES CTR
     * @param {*} data data to be padded
     * @param {*} blockSize block size of cipher
     * @returns  padded data
     */
    this.pad = async (data, blockSize) => {
      const padding = blockSize - (data.length % blockSize);
      const paddedData = new Uint8Array(data.length + padding);
      paddedData.set(data);
      return paddedData;
    };

    this.decryptAesCtr = async (encryptedData, aesKey, formatOut) => {
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
        if (error) {
          throw new Error(error);
        } else {
          throw new Error("AES decryption failed!");
        }
      }
    };

    /**
     * Generate a UTC time/date string
     * @returns UTC time/date string
     */
    this.getTimeDateString = () => {
      const currentDate = new Date();
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getUTCDate()).padStart(2, "0");
      const hours = String(currentDate.getUTCHours()).padStart(2, "0");
      const minutes = String(currentDate.getUTCMinutes()).padStart(2, "0");
      const seconds = String(currentDate.getUTCSeconds()).padStart(2, "0");
      const formattedUTCDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
      return formattedUTCDateTime;
    };

    /**
     * Constructor
     */
    this.apiKey = apiKey;
    this.serverUrl = serverUrl;
    this.aesKey = this.generateAesKey();
    this.orderId = "";
    this.client = client;
    this.connectionId = "";
    this.pendingMessages = {}; // Store pending messages awaiting response
    this.datasetUpload = false;
  }

  /**
   * Init method
   * @param {String} serverUrl URL of server
   * @param {String} apiKey API key
   * @param {String} client ClientID (default = 'api')

   * @returns {Neuropacs} instance
   */
  static init(serverUrl, apiKey, client = "api") {
    return new Neuropacs(serverUrl, apiKey, client);
  }

  /**
   * Create a connection with the server

   * @returns {String} Base64 string encrypted AES key
   */
  async connect() {
    const headers = {
      "Content-Type": "text/plain",
      Client: this.client
    };

    const body = {
      aes_key: this.aesKey,
      api_key: this.apiKey
    };

    try {
      const encryptedBody = await this.oaepEncrypt(body);

      const response = await fetch(`${this.serverUrl}/api/connect/`, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (!response.ok) {
        throw { neuropacsError: `${await response.text()}` };
      }

      const json = await response.json();
      const connectionId = json.connectionID;
      this.connectionId = connectionId;
      return {
        timestamp: this.getTimeDateString(),
        connectionId: connectionId,
        aesKey: this.aesKey
      };
    } catch (error) {
      if (error.neuropacsError) {
        throw new Error(error.neuropacsError);
      } else {
        throw new Error("Connection failed!");
      }
    }
  }

  /**
   * Create a new order

   * @returns {String} Base64 string orderID.
   */
  async newJob() {
    try {
      const url = `${this.serverUrl}/api/newJob/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": this.connectionId,
        Client: this.client
      };

      const response = await fetch(url, {
        method: "POST",
        headers: headers
      });

      if (!response.ok) {
        throw { neuropacsError: `${await response.text()}` };
      }

      const text = await response.text();
      const orderId = await this.decryptAesCtr(text, this.aesKey, "string");
      this.orderId = orderId;
      return orderId;
    } catch (error) {
      if (error.neuropacsError) {
        throw new Error(error.neuropacsError);
      } else {
        throw new Error("Job creation failed!");
      }
    }
  }

  /**
   * Upload a dataset to the socket
   * @param {Array<File>/Array<Uint8Array>} dataset
   * @param {String} orderId Base64 order_id.
   * @param {String} connectionId Base64 connection_id.
   * @param {String} aesKey Base64 AES key.
   * @returns {Number} Upload completion status
   */
  async uploadDataset(dataset, orderId = null) {
    try {
      if (orderId == null) {
        orderId = this.orderID;
      }

      const datasetId = this.generateUniqueId(); //!Change this

      this.datasetUpload = true;

      const totalFiles = dataset.length;

      for (let i = 0; i < totalFiles; i++) {
        const curData = dataset[i];
        await this.upload(curData, datasetId, orderId);
        this.printProgressBar(i + 1, totalFiles);
      }

      return datasetId;
    } catch (error) {
      console.log(error);
      if (error.neuropacsError) {
        throw new Error(error.neuropacsError);
      } else {
        throw new Error("Dataset upload failed!");
      }
    }
  }

  /**
   * Upload a file to the socket
   * @param {Uint8Array/File} data Data to be uploaded
   * @param {String} datasetId Base64 datasetId
   * @param {String} orderId Base64 orderId (optional)
   *
   * @returns {Number} Upload status code.
   */
  async upload(data, datasetId, orderId = null) {
    if (orderId == null) {
      orderId = this.orderId;
    }

    let filename = "";

    if (data instanceof Uint8Array) {
      filename = this.generateFilename();
    } else if (data instanceof File) {
      // Assuming 'data' is a File object or a string representing a file path
      const file = data instanceof File ? data : await this.readFile(data);
      if (file.name) {
        filename = file.name;
      } else {
        filename = this.generateFilename();
      }
    } else {
      throw { neuropacsError: "Unsupported data type!" };
    }

    //encrypt order ID
    const encryptedOrderId = await this.encryptAesCtr(
      orderId,
      this.aesKey,
      "string",
      "string"
    );

    //headers for upload request
    const uploadParamHeaders = {
      "Content-Type": "application/octet-stream",
      "connection-id": this.connectionId,
      client: this.client,
      "order-id": encryptedOrderId,
      filename: filename,
      "dataset-id": datasetId
    };

    // get s3 upload params
    const s3Res = await fetch(`${this.serverUrl}/api/uploadRequest/`, {
      headers: uploadParamHeaders
    });

    if (!s3Res.ok) {
      throw { neuropacsError: `${await s3Res.text()}` };
    }

    const s3ResText = await s3Res.text();

    const s3Json = await this.decryptAesCtr(s3ResText, this.aesKey, "JSON");

    const presigned_url = s3Json["presignedURL"];

    const form = {
      "Content-Disposition": "form-data",
      filename: filename
      // name: "test123"
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

    let encryptedBinaryData;

    if (data instanceof Uint8Array) {
      encryptedBinaryData = await this.encryptAesCtr(
        data,
        this.aesKey,
        "Uint8Array",
        "bytes"
      );
    } else if (data instanceof File) {
      const binaryData = await this.readFileAsArrayBuffer(data);
      encryptedBinaryData = await this.encryptAesCtr(
        new Uint8Array(binaryData),
        this.aesKey,
        "Uint8Array",
        "bytes"
      );
    } else {
      throw { neuropacsError: "Unsupported data type!" };
    }

    // construct message
    const message = new Uint8Array([
      ...headerBytes,
      ...encryptedBinaryData,
      ...new TextEncoder().encode(END)
    ]);

    //upload to s3 with presigned url
    const upload_res = await fetch(presigned_url, {
      method: "PUT",
      body: message
    });

    if (!upload_res.ok) {
      throw { neuropacsError: `${await upload_res.text()}` };
    }

    return 201; // Upload success status code
  }

  uint8ArrayToBase64(uint8Array) {
    let binary = "";
    uint8Array.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  /**
   * Run a job
   * @param {String} productId Product to be executed
   * @param {String} orderId Base64 order Id (optional)
   * @param {String} datasetId Base64 dataset Id (optional)

   * @returns {Number} Job run status code
   */
  async runJob(productId, orderId = null, datasetId = null) {
    if (orderId == null) {
      orderId = this.orderId;
    }

    try {
      const url = `${this.serverUrl}/api/runJob/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": this.connectionId,
        Client: this.client
      };

      const body = {
        orderID: orderId,
        productID: productId,
        datasetID: datasetId
      };

      const encryptedBody = await this.encryptAesCtr(
        body,
        this.aesKey,
        "JSON",
        "string"
      );

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (!response.ok) {
        throw { neuropacsError: `${await response.text()}` };
      }

      return response.status;
    } catch (error) {
      if (error.neuropacsError) {
        throw new Error(error.neuropacsError);
      } else {
        throw new Error("Job run failed!");
      }
    }
  }

  /**
   * Check job status
   * @param {String} orderId Base64 order_id (optional)
   * @param {String} datasetId Base64 dataset_id (optional)
  
   * @returns {Number} Job status message
   */
  async checkStatus(orderId = null, datasetId = null) {
    if (orderId == null) {
      orderId = this.orderId;
    }

    try {
      const url = `${this.serverUrl}/api/checkStatus/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": this.connectionId,
        Client: this.client
      };

      const body = {
        orderID: orderId,
        datasetID: datasetId
      };

      const encryptedBody = await this.encryptAesCtr(
        body,
        this.aesKey,
        "JSON",
        "string"
      );

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (!response.ok) {
        throw { neuropacsError: `${await response.text()}` };
      }

      const text = await response.text();
      const json = await this.decryptAesCtr(text, this.aesKey, "JSON");
      return json;
    } catch (error) {
      if (error.neuropacsError) {
        throw new Error(error.neuropacsError);
      } else {
        throw new Error("Status check failed.");
      }
    }
  }

  /**
   * Get job results
   * @param {String} format Base64 AES key
   * @param {String} orderId Base64 connection_id(optional)
   * @param {String} datasetId Base64 dataset_id (optional)

   * @returns  AES encrypted file data in specified format
   */
  async getResults(format, orderId = null, datasetId = null) {
    try {
      if (orderId == null) {
        orderId = this.orderId;
      }

      const url = `${this.serverUrl}/api/getResults/`;
      const headers = {
        "Content-Type": "text/plain",
        "Connection-Id": this.connectionId,
        Client: this.client
      };

      const validFormats = ["TXT", "XML", "JSON", "DCM", "PDF"];

      if (!validFormats.includes(format)) {
        throw {
          neuropacsError: `Invalid format! Valid formats include: "TXT", "JSON", "XML", "PDF", "DCM.`
        };
      }

      const body = {
        orderID: orderId,
        format: format,
        datasetID: datasetId
      };

      const encryptedBody = await this.encryptAesCtr(
        body,
        this.aesKey,
        "JSON",
        "string"
      );

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: encryptedBody
      });

      if (!response.ok) {
        throw { neuropacsError: `${await response.text()}` };
      }

      const text = await response.text();
      const decryptedFileData = await this.decryptAesCtr(
        text,
        this.aesKey,
        "string"
      );

      return decryptedFileData;
    } catch (error) {
      if (error.neuropacsError) {
        throw new Error(error.neuropacsError);
      } else {
        throw new Error("Result retrieval failed!");
      }
    }
  }
}

window.Neuropacs = Neuropacs;
