/*!
 * NeuroPACS v1.0.0
 * (c) 2023 Kerrick Cavanaugh
 * Released under the MIT License.
 */
const io = require("../lib/socket.io.min.js");

/*!
 * NeuroPACS v1.0.0
 * (c) 2023 Kerrick Cavanaugh
 * Released under the MIT License.
 */ class Neuropacs {
  constructor(t, e) {
    (this.apiKey = t),
      (this.serverUrl = e),
      (this.ackRecieved = !1),
      (this.datasetUpload = !1);
  }
  loadSocketIOCdn(t, e) {
    var r = document.createElement("script");
    (r.type = "text/javascript"),
      (r.src = t),
      (r.onload = e),
      document.head.appendChild(r);
  }
  disconnectFromSocket() {
    this.socket.close(!1), console.log("Disconnected from upload socket.");
  }
  connectToSocket() {
    this.socket.connect();
  }
  async uploadDataset(t, e, r, a) {
    await this.initSocketIO(),
      (this.datasetUpload = !0),
      this.connectToSocket();
    let n = t.length;
    for (let i = 0; i < n; i++) {
      let o = t[i];
      await this.upload(o, e, r, a), this.printProgressBar(i + 1, n);
    }
    return this.disconnectFromSocket(), 201;
  }
  printProgressBar(t, e, r = 50) {
    let a =
      Array(Math.floor((t / e) * r))
        .fill("=")
        .join("") +
      Array(r - Math.floor((t / e) * r))
        .fill(".")
        .join("");
    console.clear(), console.log(`[${a}] ${((t / e) * 100).toFixed(2)}%`);
  }
  async upload(t, e, r, a) {
    (this.ackReceived = !1),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket());
    let n = "";
    if (t instanceof Uint8Array) n = this.generateFilename();
    else if (t instanceof File) {
      let i = t instanceof File ? t : await this.readFile(t);
      n = i.name;
    } else throw Error("Unsupported data type!");
    let o = {
        "Content-Disposition": "form-data",
        filename: n,
        name: "test123"
      },
      s = "neuropacs----------",
      c = "\r\n",
      l = `--${s}${c}`,
      h = `--${s}--${c}`,
      d = l;
    for (let [p, y] of Object.entries(o)) d += `${p}: ${y};`;
    (d += c),
      (d += "Content-Type: application/octet-stream"),
      (d += `${c}${c}`);
    let w = new TextEncoder().encode(d),
      u = await this.encryptAesCtr(e, a, "string", "string"),
      f;
    if (t instanceof Uint8Array)
      f = await this.encryptAesCtr(t, a, "Uint8Array", "bytes");
    else if (t instanceof File) {
      let m = await this.readFileAsArrayBuffer(t);
      f = await this.encryptAesCtr(new Uint8Array(m), a, "Uint8Array", "bytes");
    } else throw Error("Unsupported data type!");
    let k = new Uint8Array([...w, ...f, ...new TextEncoder().encode(h)]);
    this.socket.emit("file_data", {
      data: k,
      headers: {
        "Content-Type": "application/octet-stream",
        "connection-id": r,
        client: "API",
        "order-id": u
      }
    });
    let C = Date.now(),
      S = 0;
    for (; !this.ackReceived && S < 10; )
      (S = (Date.now() - C) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    if (S > 10) throw (this.disconnectFromSocket(), Error("Upload timeout!"));
    return this.datasetUpload || this.disconnectFromSocket(), 201;
  }
  generateFilename() {
    return "generated_filename";
  }
  async readFileAsArrayBuffer(t) {
    return new Promise((e, r) => {
      let a = new FileReader();
      (a.onload = () => e(a.result)), (a.onerror = r), a.readAsArrayBuffer(t);
    });
  }
  initSocketIOFromCDN(t) {
    this.loadSocketIOCdn(
      "https://neuropacs.com/js/lib/socket.io.min.js",
      () => {
        (this.socket = io(this.serverUrl, {
          autoConnect: !1,
          transports: ["websocket"]
        })),
          this.socket.on("connect", () => {
            console.log("Connected to upload socket!");
          }),
          this.socket.on("ack", (t) => {
            "0" == t ? (this.ackReceived = !0) : this.disconnectFromSocket();
          }),
          this.socket.on("error", (t) => {
            console.error("Socket.IO error:", t);
          }),
          t();
      }
    );
  }
  initSocketIO() {
    return new Promise(async (t) => {
      try {
        (this.socket = io(this.serverUrl, {
          autoConnect: !1,
          transports: ["websocket"]
        })),
          this.socket.on("connect", () => {
            console.log("Connected to upload socket!");
          }),
          this.socket.on("ack", (t) => {
            "0" == t ? (this.ackReceived = !0) : this.disconnectFromSocket();
          }),
          this.socket.on("error", (t) => {
            console.error("Socket.IO error:", t);
          }),
          t();
      } catch (e) {
        this.initSocketIOFromCDN(t);
      }
    });
  }
  generateAesKey() {
    let t = new Uint8Array(16);
    window.crypto.getRandomValues(t);
    let e = btoa(String.fromCharCode.apply(null, t));
    return e;
  }
  async oaepEncrypt(t) {
    try {
      t = JSON.stringify(t);
    } catch (e) {
      if ("string" != typeof t)
        throw Error("Plaintext must be a string or JSON!");
    }
    let r = await getPublicKey(),
      a = new TextEncoder().encode(r),
      n = a.buffer,
      i = await crypto.subtle.importKey(
        "spki",
        n,
        { name: "RSA-OAEP", hash: "SHA-256" },
        !1,
        ["encrypt"]
      ),
      o = new TextEncoder().encode(t),
      s = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, i, o),
      c = Array.from(new Uint8Array(s)),
      l = btoa(String.fromCharCode(...c));
    return l;
  }
  async connect(t, e) {
    let r = await this.oaepEncrypt({ aes_key: e, api_key: t });
    try {
      let a = await fetch(`${this.serverUrl}/connect/`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", client: "api" },
        body: r
      });
      if (a.ok) {
        let n = await a.json(),
          i = n.connectionID;
        return i;
      }
      throw Error(`Connection failed! Status: ${a.status}`);
    } catch (o) {
      throw Error("Failed to connect to the server.");
    }
  }
  async getPublicKey() {
    try {
      let t = await fetch(`${this.serverUrl}/getPubKey/`);
      if (t.ok) {
        let e = await t.json(),
          r = e.pub_key;
        return r;
      }
      throw Error(`Public key retrieval failed! Status: ${t.status}`);
    } catch (a) {
      throw Error("Failed to retrieve the public key.");
    }
  }
  async newJob(t, e) {
    try {
      let r = `${this.serverUrl}/newJob/`,
        a = await fetch(r, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            "Connection-Id": t,
            Client: "API"
          }
        });
      if (201 === a.status) {
        let n = await a.text(),
          i = await this.decryptAesCtr(n, e, "string");
        return i;
      }
      throw Error(`Job creation returned status ${a.status}.`);
    } catch (o) {
      throw Error("Failed to create a new job.");
    }
  }
  async runJob(t, e, r, a) {
    try {
      let n = `${this.serverUrl}/runJob/`,
        i = await this.encryptAesCtr(
          { orderID: e, productID: t },
          a,
          "JSON",
          "string"
        ),
        o = await fetch(n, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            "Connection-Id": r,
            Client: "API"
          },
          body: i
        });
      if (202 === o.status) return o.status;
      throw Error("Job run failed.");
    } catch (s) {
      throw Error("Failed to run the job.");
    }
  }
  async checkStatus(t, e, r) {
    try {
      let a = `${this.serverUrl}/checkStatus/`,
        n = await this.encryptAesCtr({ orderID: t }, r, "JSON", "string"),
        i = await fetch(a, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            "connection-id": e,
            client: "api"
          },
          body: n
        });
      if (200 === i.status) {
        let o = await i.text(),
          s = await this.decryptAesCtr(o, r, "JSON");
        return s;
      }
      throw Error("Status check failed.");
    } catch (c) {
      throw Error("Failed to check status.");
    }
  }
  async getResults(t, e, r, a) {
    try {
      let n = `${this.serverUrl}/getResults/`;
      if (!["TXT", "XML", "JSON", "DICOMSR", "PDF"].includes(t))
        throw Error(
          "Invalid format! Valid formats include: 'TXT', 'JSON', 'XML', 'PDF', 'DICOMSR'."
        );
      let i = await this.encryptAesCtr(
          { orderID: e, format: t },
          a,
          "JSON",
          "string"
        ),
        o = await fetch(n, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            "Connection-Id": r,
            Client: "api"
          },
          body: i
        });
      if (200 === o.status) {
        let s = await o.text(),
          c = await this.decryptAesCtr(s, a, "string");
        return c;
      }
      throw Error("Result retrieval failed!");
    } catch (l) {
      throw Error("Failed to retrieve results.");
    }
  }
  async oaepEncrypt(t) {
    try {
      t = "string" == typeof t ? t : JSON.stringify(t);
    } catch (e) {
      throw Error("Plaintext must be a string or JSON!");
    }
    let r = await this.getPublicKey(),
      a = r.substring(26, r.length - 24 - 1),
      n = window.atob(a),
      i = this.str2ab(n),
      o = await crypto.subtle.importKey(
        "spki",
        i,
        { name: "RSA-OAEP", hash: "SHA-256" },
        !0,
        ["encrypt"]
      ),
      s = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        o,
        new TextEncoder().encode(t)
      ),
      c = this.arrayBufferToBase64(s);
    return c;
  }
  str2ab(t) {
    let e = new ArrayBuffer(t.length),
      r = new Uint8Array(e);
    for (let a = 0, n = t.length; a < n; a++) r[a] = t.charCodeAt(a);
    return e;
  }
  arrayBufferToBase64(t) {
    let e = new Uint8Array(t);
    return btoa(String.fromCharCode.apply(null, e));
  }
  async encryptAesCtr(t, e, r, a) {
    let n;
    try {
      if ("string" == r && "string" == typeof t)
        n = new TextEncoder().encode(t);
      else if ("JSON" == r) {
        let i = JSON.stringify(t);
        n = new TextEncoder().encode(i);
      } else if ("Uint8Array" == r && t instanceof Uint8Array) n = t;
      else throw Error("Invalid plaintext format!");
    } catch (o) {
      throw Error("Invalid plaintext format!");
    }
    try {
      let s = new Uint8Array(
          atob(e)
            .split("")
            .map((t) => t.charCodeAt(0))
        ),
        c = await this.pad(n, 16),
        l = crypto.getRandomValues(new Uint8Array(16)),
        h = await crypto.subtle.importKey("raw", s, { name: "AES-CTR" }, !1, [
          "encrypt"
        ]),
        d = await crypto.subtle.encrypt(
          { name: "AES-CTR", counter: l, length: 128 },
          h,
          c
        ),
        p = new Uint8Array(l.length + d.byteLength);
      if ((p.set(l), p.set(new Uint8Array(d), l.length), "string" === a))
        return btoa(String.fromCharCode.apply(null, p));
      if ("bytes" === a) return p;
    } catch (y) {
      throw Error("AES encryption failed!");
    }
  }
  async pad(t, e) {
    let r = e - (t.length % e),
      a = new Uint8Array(t.length + r);
    return a.set(t), a;
  }
  async decryptAesCtr(t, e, r) {
    try {
      let a = new Uint8Array(
          atob(e)
            .split("")
            .map((t) => t.charCodeAt(0))
        ),
        n = new Uint8Array(
          atob(t)
            .split("")
            .map((t) => t.charCodeAt(0))
        ),
        i = n.slice(0, 16),
        o = n.slice(16),
        s = await crypto.subtle.importKey("raw", a, { name: "AES-CTR" }, !1, [
          "decrypt"
        ]),
        c = await crypto.subtle.decrypt(
          { name: "AES-CTR", counter: i, length: 128 },
          s,
          o
        ),
        l = new TextDecoder().decode(c);
      if ("JSON" === r) return (l = l.trim()), JSON.parse(l);
      if ("string" === r) return l;
    } catch (h) {
      throw Error("AES decryption failed!");
    }
  }
}

module.exports = Neuropacs;
