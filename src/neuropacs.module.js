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
        var n = document.createElement("script");
        (n.type = "text/javascript"),
          (n.src = t),
          (n.onload = e),
          document.head.appendChild(n);
      }),
      (this.disconnectFromSocket = () => {
        this.socket.close(!1), console.log("Disconnected from upload socket.");
      }),
      (this.connectToSocket = () => {
        this.socket.connect();
      }),
      (this.readFileAsArrayBuffer = async (t) =>
        new Promise((e, n) => {
          let r = new FileReader();
          (r.onload = () => e(r.result)),
            (r.onerror = n),
            r.readAsArrayBuffer(t);
        })),
      (this.printProgressBar = (t, e, n = 50) => {
        let r = (t / e) * 100,
          i =
            Array(Math.floor((t / e) * n))
              .fill("=")
              .join("") +
            Array(n - Math.floor((t / e) * n))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${i}] ${r.toFixed(2)}%`);
      }),
      (this.generateFilename = () => {
        let t =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
          e = "";
        for (let n = 0; n < 20; n++) {
          let r = Math.floor(Math.random() * t.length);
          e += t.charAt(r);
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
        let n = await this.getPublicKey(),
          r = n.substring(26, n.length - 24 - 1),
          i = window.atob(r),
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
              n = e.pub_key;
            return n;
          }
          throw Error(`Public key retrieval failed! Status: ${t.status}`);
        } catch (r) {
          throw Error("Failed to retrieve the public key.");
        }
      }),
      (this.str2ab = (t) => {
        let e = new ArrayBuffer(t.length),
          n = new Uint8Array(e);
        for (let r = 0, i = t.length; r < i; r++) n[r] = t.charCodeAt(r);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, n, r) => {
        let i;
        try {
          if ("string" == n && "string" == typeof t)
            i = new TextEncoder().encode(t);
          else if ("JSON" == n) {
            let s = JSON.stringify(t);
            i = new TextEncoder().encode(s);
          } else if ("Uint8Array" == n && t instanceof Uint8Array) i = t;
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
          if ((p.set(l), p.set(new Uint8Array(d), l.length), "string" === r))
            return btoa(String.fromCharCode.apply(null, p));
          if ("bytes" === r) return p;
        } catch (y) {
          throw Error("AES encryption failed!");
        }
      }),
      (this.pad = async (t, e) => {
        let n = e - (t.length % e),
          r = new Uint8Array(t.length + n);
        return r.set(t), r;
      }),
      (this.decryptAesCtr = async (t, e, n) => {
        try {
          let r = new Uint8Array(
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
              r,
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
          if ("JSON" === n) return (l = l.trim()), JSON.parse(l);
          if ("string" === n) return l;
        } catch (h) {
          throw Error("AES decryption failed!");
        }
      }),
      (this.getTimeDateString = () => {
        let t = new Date(),
          e = t.getUTCFullYear(),
          n = String(t.getUTCMonth() + 1).padStart(2, "0"),
          r = String(t.getUTCDate()).padStart(2, "0"),
          i = String(t.getUTCHours()).padStart(2, "0"),
          s = String(t.getUTCMinutes()).padStart(2, "0"),
          a = String(t.getUTCSeconds()).padStart(2, "0"),
          o = `${e}-${n}-${r} ${i}:${s}:${a} UTC`;
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
        n = await fetch(`${this.serverUrl}/connect/`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", client: "api" },
          body: e
        });
      if (n.ok) {
        let r = await n.json(),
          i = r.connectionID;
        return (
          (this.connectionId = i),
          {
            timestamp: this.getTimeDateString(),
            connectionId: i,
            aesKey: this.aesKey
          }
        );
      }
      throw Error();
    } catch (s) {
      throw Error("Connection failed!");
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
        n = await fetch(t, { method: "POST", headers: e });
      if (201 === n.status) {
        let r = await n.text(),
          i = await this.decryptAesCtr(r, this.aesKey, "string");
        return (this.orderId = i), i;
      }
      throw Error();
    } catch (s) {
      throw Error("Job creation failed!");
    }
  }
  async uploadDataset(t, e = null) {
    null == e && (e = this.orderID),
      await this.initSocketIO(),
      (this.datasetUpload = !0),
      this.connectToSocket();
    let n = t.length;
    for (let r = 0; r < n; r++) {
      let i = t[r];
      await this.upload(i, e), this.printProgressBar(r + 1, n);
    }
    return this.disconnectFromSocket(), 201;
  }
  async upload(t, e = null) {
    null == e && (e = this.orderId),
      (this.ackReceived = !1),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket());
    let n = "";
    if (t instanceof Uint8Array) n = this.generateFilename();
    else if (t instanceof File) {
      let r = t instanceof File ? t : await this.readFile(t);
      n = r.name;
    } else throw Error("Unsupported data type!");
    let i = {
        "Content-Disposition": "form-data",
        filename: n,
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
      m = {
        "Content-Type": "application/octet-stream",
        "connection-id": this.connectionId,
        client: "API",
        "order-id": y
      };
    this.socket.emit("file_data", { data: f, headers: m });
    let C = Date.now(),
      g = 0;
    for (; !this.ackReceived && g < 10; )
      (g = (Date.now() - C) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    if (g > 10) throw (this.disconnectFromSocket(), Error("Upload timeout!"));
    return this.datasetUpload || this.disconnectFromSocket(), 201;
  }
  async runJob(t, e = null) {
    null == e && (e = this.orderId);
    try {
      let n = `${this.serverUrl}/runJob/`,
        r = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "API"
        },
        i = { orderID: e, productID: t },
        s = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        a = await fetch(n, { method: "POST", headers: r, body: s });
      if (202 === a.status) return a.status;
      throw Error();
    } catch (o) {
      throw Error("Job run failed.");
    }
  }
  async checkStatus(t = null) {
    null == t && (t = this.orderId);
    try {
      let e = `${this.serverUrl}/checkStatus/`,
        n = {
          "Content-Type": "text/plain",
          "connection-id": this.connectionId,
          client: "api"
        },
        r = { orderID: t },
        i = await this.encryptAesCtr(r, this.aesKey, "JSON", "string"),
        s = await fetch(e, { method: "POST", headers: n, body: i });
      if (200 === s.status) {
        let a = await s.text(),
          o = await this.decryptAesCtr(a, this.aesKey, "JSON");
        return o;
      }
      throw Error();
    } catch (c) {
      throw Error("Status check failed.");
    }
  }
  async getResults(t, e = null) {
    null == e && (e = this.orderId);
    try {
      let n = `${this.serverUrl}/getResults/`,
        r = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "api"
        };
      if (!["TXT", "XML", "JSON"].includes(t))
        throw Error(
          'Invalid format! Valid formats include: "TXT", "JSON", "XML".'
        );
      let i = { orderID: e, format: t },
        s = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        a = await fetch(n, { method: "POST", headers: r, body: s });
      if (200 === a.status) {
        let o = await a.text(),
          c = await this.decryptAesCtr(o, this.aesKey, "string");
        return c;
      }
      throw Error();
    } catch (l) {
      throw Error("Result retrieval failed!");
    }
  }
}

module.exports = Neuropacs;
