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
          let i = new FileReader();
          (i.onload = () => e(i.result)),
            (i.onerror = n),
            i.readAsArrayBuffer(t);
        })),
      (this.printProgressBar = (t, e, n = 50) => {
        let i = (t / e) * 100,
          r =
            Array(Math.floor((t / e) * n))
              .fill("=")
              .join("") +
            Array(n - Math.floor((t / e) * n))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${r}] ${i.toFixed(2)}%`);
      }),
      (this.generateFilename = () => {
        let t =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
          e = "";
        for (let n = 0; n < 20; n++) {
          let i = Math.floor(Math.random() * t.length);
          e += t.charAt(i);
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
          i = n.substring(26, n.length - 24 - 1),
          r = window.atob(i),
          a = this.str2ab(r),
          s = await crypto.subtle.importKey(
            "spki",
            a,
            { name: "RSA-OAEP", hash: "SHA-256" },
            !0,
            ["encrypt"]
          ),
          o = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            s,
            new TextEncoder().encode(t)
          ),
          c = this.arrayBufferToBase64(o);
        return c;
      }),
      (this.getPublicKey = async () => {
        try {
          let t = await fetch(`${this.serverUrl}/api/getPubKey/`);
          if (t.ok) {
            let e = await t.json(),
              n = e.pub_key;
            return n;
          }
          throw Error(`Public key retrieval failed! Status: ${t.status}`);
        } catch (i) {
          throw Error("Failed to retrieve the public key.");
        }
      }),
      (this.str2ab = (t) => {
        let e = new ArrayBuffer(t.length),
          n = new Uint8Array(e);
        for (let i = 0, r = t.length; i < r; i++) n[i] = t.charCodeAt(i);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, n, i) => {
        let r;
        try {
          if ("string" == n && "string" == typeof t)
            r = new TextEncoder().encode(t);
          else if ("JSON" == n) {
            let a = JSON.stringify(t);
            r = new TextEncoder().encode(a);
          } else if ("Uint8Array" == n && t instanceof Uint8Array) r = t;
          else throw Error("Invalid plaintext format!");
        } catch (s) {
          throw Error("Invalid plaintext format!");
        }
        try {
          let o = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            c = await this.pad(r, 16),
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
          if ((p.set(l), p.set(new Uint8Array(d), l.length), "string" === i))
            return btoa(String.fromCharCode.apply(null, p));
          if ("bytes" === i) return p;
        } catch (y) {
          throw Error("AES encryption failed!");
        }
      }),
      (this.pad = async (t, e) => {
        let n = e - (t.length % e),
          i = new Uint8Array(t.length + n);
        return i.set(t), i;
      }),
      (this.decryptAesCtr = async (t, e, n) => {
        try {
          let i = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            r = new Uint8Array(
              atob(t)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            a = r.slice(0, 16),
            s = r.slice(16),
            o = await crypto.subtle.importKey(
              "raw",
              i,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            c = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: a, length: 128 },
              o,
              s
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
          i = String(t.getUTCDate()).padStart(2, "0"),
          r = String(t.getUTCHours()).padStart(2, "0"),
          a = String(t.getUTCMinutes()).padStart(2, "0"),
          s = String(t.getUTCSeconds()).padStart(2, "0"),
          o = `${e}-${n}-${i} ${r}:${a}:${s} UTC`;
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
        n = await fetch(`${this.serverUrl}/api/connect/`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", client: "api" },
          body: e
        });
      if (n.ok) {
        let i = await n.json(),
          r = i.connectionID;
        return (
          (this.connectionId = r),
          {
            timestamp: this.getTimeDateString(),
            connectionId: r,
            aesKey: this.aesKey
          }
        );
      }
      throw (console.log(n), Error());
    } catch (a) {
      throw (console.log(a), Error("Connection failed!"));
    }
  }
  async newJob() {
    try {
      let t = `${this.serverUrl}/api/newJob/`,
        e = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "API"
        },
        n = await fetch(t, { method: "POST", headers: e });
      if (201 === n.status) {
        let i = await n.text(),
          r = await this.decryptAesCtr(i, this.aesKey, "string");
        return (this.orderId = r), r;
      }
      throw Error();
    } catch (a) {
      throw Error("Job creation failed!");
    }
  }
  async uploadDataset(t, e = null) {
    null == e && (e = this.orderID),
      await this.initSocketIO(),
      (this.datasetUpload = !0),
      this.connectToSocket();
    let n = t.length;
    for (let i = 0; i < n; i++) {
      let r = t[i];
      await this.upload(r, e), this.printProgressBar(i + 1, n);
    }
    return this.disconnectFromSocket(), 201;
  }
  async upload(t, e = null, n = null) {
    null == e && (e = this.orderId),
      (this.ackReceived = !1),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket());
    let i = "";
    if (t instanceof Uint8Array) i = this.generateFilename();
    else if (t instanceof File) {
      let r = t instanceof File ? t : await this.readFile(t);
      i = r.name;
    } else throw Error("Unsupported data type!");
    let a = {
        "Content-Disposition": "form-data",
        filename: i,
        name: "test123"
      },
      s = "neuropacs----------",
      o = "\r\n",
      c = `--${s}${o}`,
      l = `--${s}--${o}`,
      h = c;
    for (let [d, p] of Object.entries(a)) h += `${d}: ${p};`;
    (h += o),
      (h += "Content-Type: application/octet-stream"),
      (h += `${o}${o}`);
    let y = new TextEncoder().encode(h),
      u = await this.encryptAesCtr(e, this.aesKey, "string", "string"),
      w;
    if (t instanceof Uint8Array)
      w = await this.encryptAesCtr(t, this.aesKey, "Uint8Array", "bytes");
    else if (t instanceof File) {
      let f = await this.readFileAsArrayBuffer(t);
      w = await this.encryptAesCtr(
        new Uint8Array(f),
        this.aesKey,
        "Uint8Array",
        "bytes"
      );
    } else throw Error("Unsupported data type!");
    let C = new Uint8Array([...y, ...w, ...new TextEncoder().encode(l)]),
      g = {};
    (g = n
      ? {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          "dataset-id": n,
          client: "API",
          "order-id": u
        }
      : {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          client: "API",
          "order-id": u
        }),
      console.log(g),
      this.socket.emit("file_data", { data: C, headers: g });
    let m = Date.now(),
      k = 0;
    for (; !this.ackReceived && k < 10; )
      (k = (Date.now() - m) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    if (k > 10) throw (this.disconnectFromSocket(), Error("Upload timeout!"));
    return this.datasetUpload || this.disconnectFromSocket(), 201;
  }
  async runJob(t, e = null, n = null) {
    null == e && (e = this.orderId);
    try {
      let i = `${this.serverUrl}/api/runJob/`,
        r = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "API"
        },
        a = { orderID: e, productID: t, datasetID: n },
        s = await this.encryptAesCtr(a, this.aesKey, "JSON", "string"),
        o = await fetch(i, { method: "POST", headers: r, body: s });
      if (202 === o.status) return o.status;
      throw Error();
    } catch (c) {
      throw Error("Job run failed.");
    }
  }
  async checkStatus(t = null) {
    null == t && (t = this.orderId);
    try {
      let e = `${this.serverUrl}/api/checkStatus/`,
        n = {
          "Content-Type": "text/plain",
          "connection-id": this.connectionId,
          client: "api"
        },
        i = { orderID: t },
        r = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        a = await fetch(e, { method: "POST", headers: n, body: r });
      if (200 === a.status) {
        let s = await a.text(),
          o = await this.decryptAesCtr(s, this.aesKey, "JSON");
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
      let n = `${this.serverUrl}/api/getResults/`,
        i = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "api"
        };
      if (!["TXT", "XML", "JSON", "DCM", "PDF"].includes(t))
        throw Error(
          'Invalid format! Valid formats include: "TXT", "JSON", "XML", "PDF", "DCM.'
        );
      let r = { orderID: e, format: t },
        a = await this.encryptAesCtr(r, this.aesKey, "JSON", "string"),
        s = await fetch(n, { method: "POST", headers: i, body: a });
      if (200 === s.status) {
        let o = await s.text(),
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
