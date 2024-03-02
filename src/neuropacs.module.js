//prettier-ignore

/*!
 * NeuroPACS v1.0.0
 * (c) 2024 Kerrick Cavanaugh
 * Released under the MIT License.
 */
const io = require("../lib/socket.io.min.js");

class Neuropacs {
  constructor(t, e, r, a) {
    (this.initSocketIO = () =>
      new Promise(async (t) => {
        try {
          (this.socket = io(this.socketUrl, {
            autoConnect: !1,
            transports: ["websocket"]
          })),
            this.socket.on("ack", (t) => {
              if ("1" == t)
                throw (
                  (this.disconnectFromSocket(),
                  { neuropacsError: "Upload failed." })
                );
              (this.ackDatasetID = t), (this.ackReceived = !0);
            }),
            this.socket.on("error", (t) => {
              reject({ neuropacsError: "Socket error." });
            }),
            t();
        } catch (e) {
          this.initSocketIOFromCDN(t);
        }
      })),
      (this.waitForSocketConnection = () =>
        new Promise((t) => {
          this.socket.connected
            ? t(this.socket)
            : this.socket.on("connect", () => {
                t(this.socket);
              });
        })),
      (this.initSocketIOFromCDN = (t) => {
        this.loadSocketIOCdn(
          "https://neuropacs.com/js/lib/socket.io.min.js",
          () => {
            (this.socket = io(this.socketUrl, {
              autoConnect: !1,
              transports: ["websocket"]
            })),
              this.socket.on("ack", (t) => {
                if ("1" == t)
                  throw (
                    (this.disconnectFromSocket(),
                    { neuropacsError: "Upload failed." })
                  );
                (this.ackDatasetID = t), (this.ackReceived = !0);
              }),
              this.socket.on("error", (t) => {
                reject({ neuropacsError: "Socket error." });
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
      (this.disconnectFromSocket = async () => {
        this.socket.close(!1);
      }),
      (this.connectToSocket = async () => {
        this.socket.connect();
      }),
      (this.readFileAsArrayBuffer = async (t) =>
        new Promise((e, r) => {
          let a = new FileReader();
          (a.onload = () => e(a.result)),
            (a.onerror = r),
            a.readAsArrayBuffer(t);
        })),
      (this.printProgressBar = (t, e, r = 50) => {
        let a = (t / e) * 100,
          i =
            Array(Math.floor((t / e) * r))
              .fill("=")
              .join("") +
            Array(r - Math.floor((t / e) * r))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${i}] ${a.toFixed(2)}%`);
      }),
      (this.generateFilename = () => {
        let t =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
          e = "";
        for (let r = 0; r < 20; r++) {
          let a = Math.floor(Math.random() * t.length);
          e += t.charAt(a);
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
          a = r.substring(26, r.length - 24 - 1),
          i = window.atob(a),
          n = this.str2ab(i),
          o = await crypto.subtle.importKey(
            "spki",
            n,
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
      }),
      (this.getPublicKey = async () => {
        try {
          let t = await fetch(`${this.serverUrl}/api/getPubKey/`);
          if (!t.ok) throw { neuropacsError: `${await t.text()}` };
          let e = await t.json(),
            r = e.pub_key;
          return r;
        } catch (a) {
          if (a.neuropacsError) throw Error(a.neuropacsError);
          throw Error("Failed to retrieve the public key.");
        }
      }),
      (this.str2ab = (t) => {
        let e = new ArrayBuffer(t.length),
          r = new Uint8Array(e);
        for (let a = 0, i = t.length; a < i; a++) r[a] = t.charCodeAt(a);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, r, a) => {
        let i;
        try {
          if ("string" == r && "string" == typeof t)
            i = new TextEncoder().encode(t);
          else if ("JSON" == r) {
            let n = JSON.stringify(t);
            i = new TextEncoder().encode(n);
          } else if ("Uint8Array" == r && t instanceof Uint8Array) i = t;
          else throw Error("Invalid plaintext format!");
        } catch (o) {
          if (error) throw Error(error);
          throw Error("Plaintext decoding failed!");
        }
        try {
          let s = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            c = await this.pad(i, 16),
            h = crypto.getRandomValues(new Uint8Array(16)),
            l = await crypto.subtle.importKey(
              "raw",
              s,
              { name: "AES-CTR" },
              !1,
              ["encrypt"]
            ),
            d = await crypto.subtle.encrypt(
              { name: "AES-CTR", counter: h, length: 128 },
              l,
              c
            ),
            p = new Uint8Array(h.length + d.byteLength);
          if ((p.set(h), p.set(new Uint8Array(d), h.length), "string" === a))
            return btoa(String.fromCharCode.apply(null, p));
          if ("bytes" === a) return p;
        } catch (u) {
          if (u) throw Error(u);
          throw Error("AES encryption failed!");
        }
      }),
      (this.pad = async (t, e) => {
        let r = e - (t.length % e),
          a = new Uint8Array(t.length + r);
        return a.set(t), a;
      }),
      (this.decryptAesCtr = async (t, e, r) => {
        try {
          let a = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            i = new Uint8Array(
              atob(t)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            n = i.slice(0, 16),
            o = i.slice(16),
            s = await crypto.subtle.importKey(
              "raw",
              a,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            c = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: n, length: 128 },
              s,
              o
            ),
            h = new TextDecoder().decode(c);
          if ("JSON" === r) return (h = h.trim()), JSON.parse(h);
          if ("string" === r) return h;
        } catch (l) {
          if (l) throw Error(l);
          throw Error("AES decryption failed!");
        }
      }),
      (this.getTimeDateString = () => {
        let t = new Date(),
          e = t.getUTCFullYear(),
          r = String(t.getUTCMonth() + 1).padStart(2, "0"),
          a = String(t.getUTCDate()).padStart(2, "0"),
          i = String(t.getUTCHours()).padStart(2, "0"),
          n = String(t.getUTCMinutes()).padStart(2, "0"),
          o = String(t.getUTCSeconds()).padStart(2, "0"),
          s = `${e}-${r}-${a} ${i}:${n}:${o} UTC`;
        return s;
      }),
      (this.apiKey = r),
      (this.serverUrl = t),
      (this.aesKey = this.generateAesKey()),
      (this.orderId = ""),
      (this.client = a),
      (this.ackDatasetID = ""),
      (this.connectionId = ""),
      (this.ackRecieved = !1),
      (this.datasetUpload = !1);
  }
  static init(t, e, r = "api") {
    return new Neuropacs(t, e, r);
  }
  async connect() {
    let t = { "Content-Type": "text/plain", Client: this.client },
      e = { aes_key: this.aesKey, api_key: this.apiKey };
    try {
      let r = await this.oaepEncrypt(e),
        a = await fetch(`${this.serverUrl}/api/connect/`, {
          method: "POST",
          headers: t,
          body: r
        });
      if (!a.ok) throw { neuropacsError: `${await a.text()}` };
      let i = await a.json(),
        n = i.connectionID;
      return (
        (this.connectionId = n),
        {
          timestamp: this.getTimeDateString(),
          connectionId: n,
          aesKey: this.aesKey
        }
      );
    } catch (o) {
      if (o.neuropacsError) throw Error(o.neuropacsError);
      throw Error("Connection failed!");
    }
  }
  async newJob() {
    try {
      let t = `${this.serverUrl}/api/newJob/`,
        e = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        },
        r = await fetch(t, { method: "POST", headers: e });
      if (!r.ok) throw { neuropacsError: `${await r.text()}` };
      let a = await r.text(),
        i = await this.decryptAesCtr(a, this.aesKey, "string");
      return (this.orderId = i), i;
    } catch (n) {
      if (n.neuropacsError) throw Error(n.neuropacsError);
      throw Error("Job creation failed!");
    }
  }
  async uploadDataset(t, e = null) {
    try {
      null == e && (e = this.orderID),
        await this.initSocketIO(),
        await this.connectToSocket(),
        (this.datasetUpload = !0);
      let r = t.length;
      for (let a = 0; a < r; a++) {
        let i = t[a];
        await this.upload(i, e), this.printProgressBar(a + 1, r);
      }
      return await this.disconnectFromSocket(), this.ackDatasetID;
    } catch (n) {
      if (n.neuropacsError) throw Error(n.neuropacsError);
      throw Error("Dataset upload failed!");
    }
  }
  async upload(t, e = null, r = null) {
    null == e && (e = this.orderId),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket()),
      await this.waitForSocketConnection();
    let a = "";
    if (t instanceof Uint8Array) a = this.generateFilename();
    else if (t instanceof File) {
      let i = t instanceof File ? t : await this.readFile(t);
      a = i.name ? i.name : this.generateFilename();
    } else throw { neuropacsError: "Unsupported data type!" };
    let n = { "Content-Disposition": "form-data", filename: a },
      o = "neuropacs----------",
      s = "\r\n",
      c = `--${o}${s}`,
      h = `--${o}--${s}`,
      l = c;
    for (let [d, p] of Object.entries(n)) l += `${d}: ${p};`;
    (l += s),
      (l += "Content-Type: application/octet-stream"),
      (l += `${s}${s}`);
    let u = new TextEncoder().encode(l),
      w = await this.encryptAesCtr(e, this.aesKey, "string", "string"),
      y;
    if (t instanceof Uint8Array)
      y = await this.encryptAesCtr(t, this.aesKey, "Uint8Array", "bytes");
    else if (t instanceof File) {
      let f = await this.readFileAsArrayBuffer(t);
      y = await this.encryptAesCtr(
        new Uint8Array(f),
        this.aesKey,
        "Uint8Array",
        "bytes"
      );
    } else throw { neuropacsError: "Unsupported data type!" };
    let k = new Uint8Array([...u, ...y, ...new TextEncoder().encode(h)]),
      C = {};
    C = r
      ? {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          "dataset-id": r,
          Client: this.client,
          "order-id": w
        }
      : {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          Client: this.client,
          "order-id": w
        };
    let m = { action: "upload", data: k, headers: C };
    this.socket.emit("action", m);
    let g = Date.now();
    this.ackReceived = !1;
    let S = 0;
    for (; !this.ackReceived && S < 10; ) {
      if (S > 10)
        throw (
          (await this.disconnectFromSocket(),
          { neuropacsError: "Upload timeout." })
        );
      (S = (Date.now() - g) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    }
    return this.datasetUpload
      ? 201
      : (this.disconnectFromSocket(), this.ackDatasetID);
  }
  async runJob(t, e = null, r = null) {
    null == e && (e = this.orderId);
    try {
      let a = `${this.serverUrl}/api/runJob/`,
        i = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        },
        n = { orderID: e, productID: t, datasetID: r },
        o = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        s = await fetch(a, { method: "POST", headers: i, body: o });
      if (!s.ok) throw { neuropacsError: `${await s.text()}` };
      return s.status;
    } catch (c) {
      if (c.neuropacsError) throw Error(c.neuropacsError);
      throw Error("Job run failed!");
    }
  }
  async checkStatus(t = null, e = null) {
    null == t && (t = this.orderId);
    try {
      let r = `${this.serverUrl}/api/checkStatus/`,
        a = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        },
        i = { orderID: t, datasetID: e },
        n = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        o = await fetch(r, { method: "POST", headers: a, body: n });
      if (!o.ok) throw { neuropacsError: `${await o.text()}` };
      let s = await o.text(),
        c = await this.decryptAesCtr(s, this.aesKey, "JSON");
      return c;
    } catch (h) {
      if (h.neuropacsError) throw Error(h.neuropacsError);
      throw Error("Status check failed.");
    }
  }
  async getResults(t, e = null, r = null) {
    try {
      null == e && (e = this.orderId);
      let a = `${this.serverUrl}/api/getResults/`,
        i = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        };
      if (!["TXT", "XML", "JSON", "DCM", "PDF"].includes(t))
        throw {
          neuropacsError:
            'Invalid format! Valid formats include: "TXT", "JSON", "XML", "PDF", "DCM.'
        };
      let n = { orderID: e, format: t, datasetID: r },
        o = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        s = await fetch(a, { method: "POST", headers: i, body: o });
      if (!s.ok) throw { neuropacsError: `${await s.text()}` };
      let c = await s.text(),
        h = await this.decryptAesCtr(c, this.aesKey, "string");
      return h;
    } catch (l) {
      if (l.neuropacsError) throw Error(l.neuropacsError);
      throw Error("Result retrieval failed!");
    }
  }
}

module.exports = Neuropacs;
