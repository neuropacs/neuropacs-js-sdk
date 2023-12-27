/*!
 * NeuroPACS v1.0.0
 * (c) 2023 Kerrick Cavanaugh
 * Released under the MIT License.
 */
const io = require("../lib/socket.io.min.js");

class Neuropacs {
  constructor(t, e) {
    (this.initSocketIO = () =>
      new Promise(async (t) => {
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
      })),
      (this.initSocketIOFromCDN = (t) => {
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
                "0" == t
                  ? (this.ackReceived = !0)
                  : this.disconnectFromSocket();
              }),
              this.socket.on("error", (t) => {
                console.error("Socket.IO error:", t);
              }),
              t();
          }
        );
      }),
      (this.loadSocketIOCdn = (t, e) => {
        var r = document.createElement("script");
        (r.type = "text/javascript"),
          (r.src = t),
          (r.onload = e),
          document.head.appendChild(r);
      }),
      (this.disconnectFromSocket = () => {
        this.socket.close(!1), console.log("Disconnected from upload socket.");
      }),
      (this.connectToSocket = () => {
        this.socket.connect();
      }),
      (this.readFileAsArrayBuffer = async (t) =>
        new Promise((e, r) => {
          let n = new FileReader();
          (n.onload = () => e(n.result)),
            (n.onerror = r),
            n.readAsArrayBuffer(t);
        })),
      (this.printProgressBar = (t, e, r = 50) => {
        let n = (t / e) * 100,
          i =
            Array(Math.floor((t / e) * r))
              .fill("=")
              .join("") +
            Array(r - Math.floor((t / e) * r))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${i}] ${n.toFixed(2)}%`);
      }),
      (this.generateFilename = () => {
        let t =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
          e = "";
        for (let r = 0; r < 20; r++) {
          let n = Math.floor(Math.random() * t.length);
          e += t.charAt(n);
        }
        return e;
      }),
      (this.generateAesKey = () => {
        let t = new Uint8Array(16);
        window.crypto.getRandomValues(t);
        let e = btoa(String.fromCharCode.apply(null, t));
        return e;
      }),
      (this.oaepEncrypt = async (t) => {
        try {
          t = "string" == typeof t ? t : JSON.stringify(t);
        } catch (e) {
          throw Error("Plaintext must be a string or JSON!");
        }
        let r = await this.getPublicKey(),
          n = r.substring(26, r.length - 24 - 1),
          i = window.atob(n),
          s = this.str2ab(i),
          a = await crypto.subtle.importKey(
            "spki",
            s,
            { name: "RSA-OAEP", hash: "SHA-256" },
            !0,
            ["encrypt"]
          ),
          o = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            a,
            new TextEncoder().encode(t)
          ),
          c = this.arrayBufferToBase64(o);
        return c;
      }),
      (this.getPublicKey = async () => {
        try {
          let t = await fetch(`${this.serverUrl}/getPubKey/`);
          if (t.ok) {
            let e = await t.json(),
              r = e.pub_key;
            return r;
          }
          throw Error(`Public key retrieval failed! Status: ${t.status}`);
        } catch (n) {
          throw Error("Failed to retrieve the public key.");
        }
      }),
      (this.str2ab = (t) => {
        let e = new ArrayBuffer(t.length),
          r = new Uint8Array(e);
        for (let n = 0, i = t.length; n < i; n++) r[n] = t.charCodeAt(n);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, r, n) => {
        let i;
        try {
          if ("string" == r && "string" == typeof t)
            i = new TextEncoder().encode(t);
          else if ("JSON" == r) {
            let s = JSON.stringify(t);
            i = new TextEncoder().encode(s);
          } else if ("Uint8Array" == r && t instanceof Uint8Array) i = t;
          else throw Error("Invalid plaintext format!");
        } catch (a) {
          throw Error("Invalid plaintext format!");
        }
        try {
          let o = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            c = await this.pad(i, 16),
            l = crypto.getRandomValues(new Uint8Array(16)),
            h = await crypto.subtle.importKey(
              "raw",
              o,
              { name: "AES-CTR" },
              !1,
              ["encrypt"]
            ),
            d = await crypto.subtle.encrypt(
              { name: "AES-CTR", counter: l, length: 128 },
              h,
              c
            ),
            p = new Uint8Array(l.length + d.byteLength);
          if ((p.set(l), p.set(new Uint8Array(d), l.length), "string" === n))
            return btoa(String.fromCharCode.apply(null, p));
          if ("bytes" === n) return p;
        } catch (y) {
          throw Error("AES encryption failed!");
        }
      }),
      (this.pad = async (t, e) => {
        let r = e - (t.length % e),
          n = new Uint8Array(t.length + r);
        return n.set(t), n;
      }),
      (this.decryptAesCtr = async (t, e, r) => {
        try {
          let n = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            i = new Uint8Array(
              atob(t)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            s = i.slice(0, 16),
            a = i.slice(16),
            o = await crypto.subtle.importKey(
              "raw",
              n,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            c = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: s, length: 128 },
              o,
              a
            ),
            l = new TextDecoder().decode(c);
          if ("JSON" === r) return (l = l.trim()), JSON.parse(l);
          if ("string" === r) return l;
        } catch (h) {
          throw Error("AES decryption failed!");
        }
      }),
      (this.getTimeDateString = () => {
        let t = new Date(),
          e = t.getUTCFullYear(),
          r = String(t.getUTCMonth() + 1).padStart(2, "0"),
          n = String(t.getUTCDate()).padStart(2, "0"),
          i = String(t.getUTCHours()).padStart(2, "0"),
          s = String(t.getUTCMinutes()).padStart(2, "0"),
          a = String(t.getUTCSeconds()).padStart(2, "0"),
          o = `${e}-${r}-${n} ${i}:${s}:${a} UTC`;
        return o;
      }),
      (this.apiKey = e),
      (this.serverUrl = t),
      (this.aesKey = this.generateAesKey()),
      (this.orderId = ""),
      (this.connectionId = ""),
      (this.ackRecieved = !1),
      (this.datasetUpload = !1);
  }
  static init(t, e) {
    return new Neuropacs(t, e);
  }
  async connect() {
    let t = { aes_key: this.aesKey, api_key: this.apiKey };
    try {
      let e = await this.oaepEncrypt(t),
        r = await fetch(`${this.serverUrl}/connect/`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", client: "api" },
          body: e
        });
      if (r.ok) {
        let n = await r.json(),
          i = n.connectionID;
        return (
          (this.connectionId = i),
          {
            timestamp: this.getTimeDateString(),
            connectionId: i,
            aesKey: this.aesKey
          }
        );
      }
      throw Error(`Connection failed! Status: ${r.status}`);
    } catch (s) {
      throw Error("Failed to connect to the server.");
    }
  }
  async newJob() {
    try {
      let t = `${this.serverUrl}/newJob/`,
        e = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "API"
        },
        r = await fetch(t, { method: "POST", headers: e });
      if (201 === r.status) {
        let n = await r.text(),
          i = await this.decryptAesCtr(n, this.aesKey, "string");
        return (this.orderId = i), i;
      }
      throw Error(`Job creation returned status ${r.status}.`);
    } catch (s) {
      throw Error("Failed to create a new job.");
    }
  }
  async uploadDataset(t, e = null) {
    null == e && (e = this.orderID),
      await this.initSocketIO(),
      (this.datasetUpload = !0),
      this.connectToSocket();
    let r = t.length;
    for (let n = 0; n < r; n++) {
      let i = t[n];
      await this.upload(i, e), this.printProgressBar(n + 1, r);
    }
    return this.disconnectFromSocket(), 201;
  }
  async upload(t, e = null) {
    null == e && (e = this.orderId),
      (this.ackReceived = !1),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket());
    let r = "";
    if (t instanceof Uint8Array) r = this.generateFilename();
    else if (t instanceof File) {
      let n = t instanceof File ? t : await this.readFile(t);
      r = n.name;
    } else throw Error("Unsupported data type!");
    let i = {
        "Content-Disposition": "form-data",
        filename: r,
        name: "test123"
      },
      s = "neuropacs----------",
      a = "\r\n",
      o = `--${s}${a}`,
      c = `--${s}--${a}`,
      l = o;
    for (let [h, d] of Object.entries(i)) l += `${h}: ${d};`;
    (l += a),
      (l += "Content-Type: application/octet-stream"),
      (l += `${a}${a}`);
    let p = new TextEncoder().encode(l),
      y = await this.encryptAesCtr(e, this.aesKey, "string", "string"),
      u;
    if (t instanceof Uint8Array)
      u = await this.encryptAesCtr(t, this.aesKey, "Uint8Array", "bytes");
    else if (t instanceof File) {
      let w = await this.readFileAsArrayBuffer(t);
      u = await this.encryptAesCtr(
        new Uint8Array(w),
        this.aesKey,
        "Uint8Array",
        "bytes"
      );
    } else throw Error("Unsupported data type!");
    let f = new Uint8Array([...p, ...u, ...new TextEncoder().encode(c)]),
      C = {
        "Content-Type": "application/octet-stream",
        "connection-id": this.connectionId,
        client: "API",
        "order-id": y
      };
    this.socket.emit("file_data", { data: f, headers: C });
    let m = Date.now(),
      S = 0;
    for (; !this.ackReceived && S < 10; )
      (S = (Date.now() - m) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    if (S > 10) throw (this.disconnectFromSocket(), Error("Upload timeout!"));
    return this.datasetUpload || this.disconnectFromSocket(), 201;
  }
  async runJob(t, e = null) {
    null == e && (e = this.orderId);
    try {
      let r = `${this.serverUrl}/runJob/`,
        n = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "API"
        },
        i = { orderID: e, productID: t },
        s = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        a = await fetch(r, { method: "POST", headers: n, body: s });
      if (202 === a.status) return a.status;
      throw Error("Job run failed.");
    } catch (o) {
      throw Error("Failed to run the job.");
    }
  }
  async checkStatus(t = null) {
    null == t && (t = this.orderId);
    try {
      let e = `${this.serverUrl}/checkStatus/`,
        r = {
          "Content-Type": "text/plain",
          "connection-id": this.connectionId,
          client: "api"
        },
        n = { orderID: t },
        i = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        s = await fetch(e, { method: "POST", headers: r, body: i });
      if (200 === s.status) {
        let a = await s.text(),
          o = await this.decryptAesCtr(a, this.aesKey, "JSON");
        return o;
      }
      throw Error("Status check failed.");
    } catch (c) {
      throw Error("Failed to check status.");
    }
  }
  async getResults(t, e = null) {
    null == e && (e = this.orderId);
    try {
      let r = `${this.serverUrl}/getResults/`,
        n = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "api"
        };
      if (!["TXT", "XML", "JSON", "DICOMSR", "PDF"].includes(t))
        throw Error(
          "Invalid format! Valid formats include: 'TXT', 'JSON', 'XML', 'PDF', 'DICOMSR'."
        );
      let i = { orderID: e, format: t },
        s = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        a = await fetch(r, { method: "POST", headers: n, body: s });
      if (200 === a.status) {
        let o = await a.text(),
          c = await this.decryptAesCtr(o, this.aesKey, "string");
        return c;
      }
      throw Error("Result retrieval failed!");
    } catch (l) {
      throw Error("Failed to retrieve results.");
    }
  }
}

module.exports = Neuropacs;
