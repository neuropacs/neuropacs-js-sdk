/*!
 * NeuroPACS v1.0.0
 * (c) 2024 Kerrick Cavanaugh
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
          o =
            Array(Math.floor((t / e) * r))
              .fill("=")
              .join("") +
            Array(r - Math.floor((t / e) * r))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${o}] ${n.toFixed(2)}%`);
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
          throw { neuropacsError: "Plaintext must be a string or JSON!" };
        }
        let r = await this.getPublicKey(),
          n = r.substring(26, r.length - 24 - 1),
          o = window.atob(n),
          a = this.str2ab(o),
          i = await crypto.subtle.importKey(
            "spki",
            a,
            { name: "RSA-OAEP", hash: "SHA-256" },
            !0,
            ["encrypt"]
          ),
          s = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            i,
            new TextEncoder().encode(t)
          ),
          c = this.arrayBufferToBase64(s);
        return c;
      }),
      (this.getPublicKey = async () => {
        try {
          let t = await fetch(`${this.serverUrl}/api/getPubKey/`);
          if (!t.ok) throw { neuropacsError: `${t.text()}` };
          let e = await t.json(),
            r = e.pub_key;
          return r;
        } catch (n) {
          if (n.neuropacsError) throw Error(n.neuropacsError);
          throw Error("Failed to retrieve the public key.");
        }
      }),
      (this.str2ab = (t) => {
        let e = new ArrayBuffer(t.length),
          r = new Uint8Array(e);
        for (let n = 0, o = t.length; n < o; n++) r[n] = t.charCodeAt(n);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, r, n) => {
        let o;
        try {
          if ("string" == r && "string" == typeof t)
            o = new TextEncoder().encode(t);
          else if ("JSON" == r) {
            let a = JSON.stringify(t);
            o = new TextEncoder().encode(a);
          } else if ("Uint8Array" == r && t instanceof Uint8Array) o = t;
          else throw Error("Invalid plaintext format!");
        } catch (i) {
          if (error) throw Error(error);
          throw Error("Plaintext decoding failed!");
        }
        try {
          let s = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            c = await this.pad(o, 16),
            l = crypto.getRandomValues(new Uint8Array(16)),
            h = await crypto.subtle.importKey(
              "raw",
              s,
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
        } catch (u) {
          if (u) throw Error(u);
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
            o = new Uint8Array(
              atob(t)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            a = o.slice(0, 16),
            i = o.slice(16),
            s = await crypto.subtle.importKey(
              "raw",
              n,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            c = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: a, length: 128 },
              s,
              i
            ),
            l = new TextDecoder().decode(c);
          if ("JSON" === r) return (l = l.trim()), JSON.parse(l);
          if ("string" === r) return l;
        } catch (h) {
          if (h) throw Error(h);
          throw Error("AES decryption failed!");
        }
      }),
      (this.getTimeDateString = () => {
        let t = new Date(),
          e = t.getUTCFullYear(),
          r = String(t.getUTCMonth() + 1).padStart(2, "0"),
          n = String(t.getUTCDate()).padStart(2, "0"),
          o = String(t.getUTCHours()).padStart(2, "0"),
          a = String(t.getUTCMinutes()).padStart(2, "0"),
          i = String(t.getUTCSeconds()).padStart(2, "0"),
          s = `${e}-${r}-${n} ${o}:${a}:${i} UTC`;
        return s;
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
        r = await fetch(`${this.serverUrl}/api/connect/`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", client: "api" },
          body: e
        });
      if (!r.ok) throw { neuropacsError: `${r.text()}` };
      let n = await r.json(),
        o = n.connectionID;
      return (
        (this.connectionId = o),
        {
          timestamp: this.getTimeDateString(),
          connectionId: o,
          aesKey: this.aesKey
        }
      );
    } catch (a) {
      if (a.neuropacsError) throw Error(a.neuropacsError);
      throw Error("Connection failed!");
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
        r = await fetch(t, { method: "POST", headers: e });
      if (!r.ok) throw { neuropacsError: `${r.text()}` };
      let n = await r.text(),
        o = await this.decryptAesCtr(n, this.aesKey, "string");
      return (this.orderId = o), o;
    } catch (a) {
      if (a.neuropacsError) throw Error(a.neuropacsError);
      throw Error("Job creation failed!");
    }
  }
  async uploadDataset(t, e = null) {
    try {
      null == e && (e = this.orderID),
        await this.initSocketIO(),
        (this.datasetUpload = !0),
        this.connectToSocket();
      let r = t.length;
      for (let n = 0; n < r; n++) {
        let o = t[n];
        await this.upload(o, e), this.printProgressBar(n + 1, r);
      }
      return this.disconnectFromSocket(), 201;
    } catch (a) {
      if (error.neuropacsError) throw Error(error.neuropacsError);
      throw Error("Dataset upload failed!");
    }
  }
  async upload(t, e = null, r = null) {
    null == e && (e = this.orderId),
      (this.ackReceived = !1),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket());
    let n = "";
    if (t instanceof Uint8Array) n = this.generateFilename();
    else if (t instanceof File) {
      let o = t instanceof File ? t : await this.readFile(t);
      n = o.name;
    } else throw { neuropacsError: "Unsupported data type!" };
    let a = {
        "Content-Disposition": "form-data",
        filename: n,
        name: "test123"
      },
      i = "neuropacs----------",
      s = "\r\n",
      c = `--${i}${s}`,
      l = `--${i}--${s}`,
      h = c;
    for (let [d, p] of Object.entries(a)) h += `${d}: ${p};`;
    (h += s),
      (h += "Content-Type: application/octet-stream"),
      (h += `${s}${s}`);
    let u = new TextEncoder().encode(h),
      y = await this.encryptAesCtr(e, this.aesKey, "string", "string"),
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
    } else throw { neuropacsError: "Unsupported data type!" };
    let C = new Uint8Array([...u, ...w, ...new TextEncoder().encode(l)]),
      g = {};
    (g = r
      ? {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          "dataset-id": r,
          client: "API",
          "order-id": y
        }
      : {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          client: "API",
          "order-id": y
        }),
      this.socket.emit("file_data", { data: C, headers: g });
    let k = Date.now(),
      m = 0;
    for (; !this.ackReceived && m < 10; )
      (m = (Date.now() - k) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    if (m > 10)
      throw (
        (this.disconnectFromSocket(), { neuropacsError: "Upload timeout!" })
      );
    return this.datasetUpload || this.disconnectFromSocket(), 201;
  }
  async runJob(t, e = null, r = null) {
    null == e && (e = this.orderId);
    try {
      let n = `${this.serverUrl}/api/runJob/`,
        o = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "API"
        },
        a = { orderID: e, productID: t, datasetID: r },
        i = await this.encryptAesCtr(a, this.aesKey, "JSON", "string"),
        s = await fetch(n, { method: "POST", headers: o, body: i });
      if (!s.ok) throw { neuropacsError: `${s.text()}` };
      return s.status;
    } catch (c) {
      if (c.neuropacsError) throw Error(c.neuropacsError);
      throw Error("Dataset upload failed!");
    }
  }
  async checkStatus(t = null) {
    null == t && (t = this.orderId);
    try {
      let e = `${this.serverUrl}/api/checkStatus/`,
        r = {
          "Content-Type": "text/plain",
          "connection-id": this.connectionId,
          client: "api"
        },
        n = { orderID: t },
        o = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        a = await fetch(e, { method: "POST", headers: r, body: o });
      if (!a.ok) throw { neuropacsError: `${a.text()}` };
      let i = await a.text(),
        s = await this.decryptAesCtr(i, this.aesKey, "JSON");
      return s;
    } catch (c) {
      if (c.neuropacsError) throw Error(c.neuropacsError);
      throw Error("Status check failed.");
    }
  }
  async getResults(t, e = null) {
    null == e && (e = this.orderId);
    try {
      let r = `${this.serverUrl}/api/getResults/`,
        n = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: "api"
        };
      if (!["TXT", "XML", "JSON", "DCM", "PDF"].includes(t))
        throw {
          neuropacsError:
            'Invalid format! Valid formats include: "TXT", "JSON", "XML", "PDF", "DCM.'
        };
      let o = { orderID: e, format: t },
        a = await this.encryptAesCtr(o, this.aesKey, "JSON", "string"),
        i = await fetch(r, { method: "POST", headers: n, body: a });
      if (!i.ok) throw { neuropacsError: `${i.text()}` };
      let s = await i.text(),
        c = await this.decryptAesCtr(s, this.aesKey, "string");
      return c;
    } catch (l) {
      if (l.neuropacsError) throw Error(l.neuropacsError);
      throw Error("Result retrieval failed!");
    }
  }
}

module.exports = Neuropacs;
