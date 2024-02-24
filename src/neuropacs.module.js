//prettier-ignore

/*!
 * NeuroPACS v1.0.0
 * (c) 2024 Kerrick Cavanaugh
 * Released under the MIT License.
 */
const io = require("../lib/socket.io.min.js");

class Neuropacs {
  constructor(t, e, r) {
    (this.initSocketIO = () =>
      new Promise(async (t) => {
        try {
          (this.socket = io(this.serverUrl, {
            autoConnect: !1,
            transports: ["websocket"]
          })),
            this.socket.on("ack", (t) => {
              if ("0" == t) this.ackReceived = !0;
              else
                throw (
                  (this.disconnectFromSocket(),
                  { neuropacsError: "Upload failed." })
                );
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
            (this.socket = io(this.serverUrl, {
              autoConnect: !1,
              transports: ["websocket"]
            })),
              this.socket.on("ack", (t) => {
                if ("0" == t) this.ackReceived = !0;
                else
                  throw (
                    (this.disconnectFromSocket(),
                    { neuropacsError: "Upload failed." })
                  );
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
          let i = new FileReader();
          (i.onload = () => e(i.result)),
            (i.onerror = r),
            i.readAsArrayBuffer(t);
        })),
      (this.printProgressBar = (t, e, r = 50) => {
        let i = (t / e) * 100,
          n =
            Array(Math.floor((t / e) * r))
              .fill("=")
              .join("") +
            Array(r - Math.floor((t / e) * r))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${n}] ${i.toFixed(2)}%`);
      }),
      (this.generateFilename = () => {
        let t =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
          e = "";
        for (let r = 0; r < 20; r++) {
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
          throw { neuropacsError: "Plaintext must be a string or JSON!" };
        }
        let r = await this.getPublicKey(),
          i = r.substring(26, r.length - 24 - 1),
          n = window.atob(i),
          a = this.str2ab(n),
          o = await crypto.subtle.importKey(
            "spki",
            a,
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
        } catch (i) {
          if (i.neuropacsError) throw Error(i.neuropacsError);
          throw Error("Failed to retrieve the public key.");
        }
      }),
      (this.str2ab = (t) => {
        let e = new ArrayBuffer(t.length),
          r = new Uint8Array(e);
        for (let i = 0, n = t.length; i < n; i++) r[i] = t.charCodeAt(i);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, r, i) => {
        let n;
        try {
          if ("string" == r && "string" == typeof t)
            n = new TextEncoder().encode(t);
          else if ("JSON" == r) {
            let a = JSON.stringify(t);
            n = new TextEncoder().encode(a);
          } else if ("Uint8Array" == r && t instanceof Uint8Array) n = t;
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
            c = await this.pad(n, 16),
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
          if ((p.set(l), p.set(new Uint8Array(d), l.length), "string" === i))
            return btoa(String.fromCharCode.apply(null, p));
          if ("bytes" === i) return p;
        } catch (u) {
          if (u) throw Error(u);
          throw Error("AES encryption failed!");
        }
      }),
      (this.pad = async (t, e) => {
        let r = e - (t.length % e),
          i = new Uint8Array(t.length + r);
        return i.set(t), i;
      }),
      (this.decryptAesCtr = async (t, e, r) => {
        try {
          let i = new Uint8Array(
              atob(e)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            n = new Uint8Array(
              atob(t)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            a = n.slice(0, 16),
            o = n.slice(16),
            s = await crypto.subtle.importKey(
              "raw",
              i,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            c = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: a, length: 128 },
              s,
              o
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
          i = String(t.getUTCDate()).padStart(2, "0"),
          n = String(t.getUTCHours()).padStart(2, "0"),
          a = String(t.getUTCMinutes()).padStart(2, "0"),
          o = String(t.getUTCSeconds()).padStart(2, "0"),
          s = `${e}-${r}-${i} ${n}:${a}:${o} UTC`;
        return s;
      }),
      (this.apiKey = e),
      (this.serverUrl = t),
      (this.aesKey = this.generateAesKey()),
      (this.orderId = ""),
      (this.client = r),
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
        i = await fetch(`${this.serverUrl}/api/connect/`, {
          method: "POST",
          headers: t,
          body: r
        });
      if (!i.ok) throw { neuropacsError: `${await i.text()}` };
      let n = await i.json(),
        a = n.connectionID;
      return (
        (this.connectionId = a),
        {
          timestamp: this.getTimeDateString(),
          connectionId: a,
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
      let i = await r.text(),
        n = await this.decryptAesCtr(i, this.aesKey, "string");
      return (this.orderId = n), n;
    } catch (a) {
      if (a.neuropacsError) throw Error(a.neuropacsError);
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
      for (let i = 0; i < r; i++) {
        let n = t[i];
        await this.upload(n, e), this.printProgressBar(i + 1, r);
      }
      return await this.disconnectFromSocket(), 201;
    } catch (a) {
      if (a.neuropacsError) throw Error(a.neuropacsError);
      throw Error("Dataset upload failed!");
    }
  }
  async upload(t, e = null, r = null) {
    null == e && (e = this.orderId),
      this.datasetUpload || (await this.initSocketIO(), this.connectToSocket()),
      await this.waitForSocketConnection();
    let i = "";
    if (t instanceof Uint8Array) i = this.generateFilename();
    else if (t instanceof File) {
      let n = t instanceof File ? t : await this.readFile(t);
      i = n.name ? n.name : this.generateFilename();
    } else throw { neuropacsError: "Unsupported data type!" };
    let a = { "Content-Disposition": "form-data", filename: i },
      o = "neuropacs----------",
      s = "\r\n",
      c = `--${o}${s}`,
      l = `--${o}--${s}`,
      h = c;
    for (let [d, p] of Object.entries(a)) h += `${d}: ${p};`;
    (h += s),
      (h += "Content-Type: application/octet-stream"),
      (h += `${s}${s}`);
    let u = new TextEncoder().encode(h),
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
    let C = new Uint8Array([...u, ...y, ...new TextEncoder().encode(l)]),
      k = {};
    (k = r
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
        }),
      this.socket.emit("file_data", { data: C, headers: k });
    let m = Date.now();
    this.ackReceived = !1;
    let g = 0;
    for (; !this.ackReceived && g < 10; ) {
      if (g > 10)
        throw (
          (await this.disconnectFromSocket(),
          { neuropacsError: "Upload timeout." })
        );
      (g = (Date.now() - m) / 1e3),
        await new Promise((t) => setTimeout(t, 100));
    }
    return this.datasetUpload || this.disconnectFromSocket(), 201;
  }
  async runJob(t, e = null, r = null) {
    null == e && (e = this.orderId);
    try {
      let i = `${this.serverUrl}/api/runJob/`,
        n = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        },
        a = { orderID: e, productID: t, datasetID: r },
        o = await this.encryptAesCtr(a, this.aesKey, "JSON", "string"),
        s = await fetch(i, { method: "POST", headers: n, body: o });
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
        i = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        },
        n = { orderID: t, datasetID: e },
        a = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        o = await fetch(r, { method: "POST", headers: i, body: a });
      if (!o.ok) throw { neuropacsError: `${await o.text()}` };
      let s = await o.text(),
        c = await this.decryptAesCtr(s, this.aesKey, "JSON");
      return c;
    } catch (l) {
      if (l.neuropacsError) throw Error(l.neuropacsError);
      throw Error("Status check failed.");
    }
  }
  async getResults(t, e = null, r = null) {
    try {
      null == e && (e = this.orderId);
      let i = `${this.serverUrl}/api/getResults/`,
        n = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        };
      if (!["TXT", "XML", "JSON", "DCM", "PDF"].includes(t))
        throw {
          neuropacsError:
            'Invalid format! Valid formats include: "TXT", "JSON", "XML", "PDF", "DCM.'
        };
      let a = { orderID: e, format: t, datasetID: r },
        o = await this.encryptAesCtr(a, this.aesKey, "JSON", "string"),
        s = await fetch(i, { method: "POST", headers: n, body: o });
      if (!s.ok) throw { neuropacsError: `${await s.text()}` };
      let c = await s.text(),
        l = await this.decryptAesCtr(c, this.aesKey, "string");
      return l;
    } catch (h) {
      if (h.neuropacsError) throw Error(h.neuropacsError);
      throw Error("Result retrieval failed!");
    }
  }
}

module.exports = Neuropacs;
