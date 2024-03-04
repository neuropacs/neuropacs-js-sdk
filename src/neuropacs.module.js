//prettier-ignore

/*!
 * NeuroPACS v1.0.0
 * (c) 2024 Kerrick Cavanaugh
 * Released under the MIT License.
 */
const io = require("../lib/socket.io.min.js");

class Neuropacs {
  constructor(t, e, r, a) {
    (this.initWebSocket = () =>
      new Promise((t, e) => {
        try {
          (this.socket = new WebSocket(this.socketUrl)),
            this.socket.addEventListener("open", (e) => {
              t();
            }),
            this.socket.addEventListener("message", async (t) => {
              try {
                let r = await this.receiveSocketData();
                "1" == r.ack
                  ? (this.disconnectFromSocket(),
                    e({ neuropacsError: "Upload failed." }))
                  : (this.ackDatasetID = r.ack);
              } catch (a) {
                e({ neuropacsError: "Error receiving socket data:", error: a });
              }
            }),
            this.socket.addEventListener("close", (t) => {}),
            this.socket.addEventListener("error", (t) => {
              e({ neuropacsError: "Socket error." });
            });
        } catch (r) {
          e(r);
        }
      })),
      (this.sendSocketData = async (t) =>
        new Promise((e, r) => {
          this.socket.readyState === WebSocket.OPEN
            ? (this.socket.send(JSON.stringify(t)), e())
            : r(Error("WebSocket is not open. Data not sent."));
        })),
      (this.receiveSocketData = async () => {
        let t = !1;
        return new Promise((e, r) => {
          let a = setTimeout(() => {
              t || r(Error("Upload timeout."));
            }, 1e4),
            i = (n) => {
              clearTimeout(a);
              try {
                let s = JSON.parse(n.data);
                "1" === s.ack ? r(Error("Upload failed.")) : ((t = !0), e(s));
              } catch (o) {
                r(o);
              }
              this.socket.removeEventListener("message", i);
            };
          this.socket.addEventListener("message", i);
        });
      }),
      (this.disconnectFromSocket = () => {
        this.socket && this.socket.close();
      }),
      (this.connectToSocket = () =>
        this.socket && this.socket.readyState !== WebSocket.CLOSED
          ? Promise.resolve()
          : this.initSocketIO()),
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
      (this.generateUniqueId = () =>
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)),
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
          s = await crypto.subtle.importKey(
            "spki",
            n,
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
        } catch (s) {
          if (error) throw Error(error);
          throw Error("Plaintext decoding failed!");
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
          if ((p.set(l), p.set(new Uint8Array(d), l.length), "string" === a))
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
            s = i.slice(16),
            o = await crypto.subtle.importKey(
              "raw",
              a,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            c = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: n, length: 128 },
              o,
              s
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
          a = String(t.getUTCDate()).padStart(2, "0"),
          i = String(t.getUTCHours()).padStart(2, "0"),
          n = String(t.getUTCMinutes()).padStart(2, "0"),
          s = String(t.getUTCSeconds()).padStart(2, "0"),
          o = `${e}-${r}-${a} ${i}:${n}:${s} UTC`;
        return o;
      }),
      (this.apiKey = r),
      (this.serverUrl = t),
      (this.socketUrl = e),
      (this.aesKey = this.generateAesKey()),
      (this.orderId = ""),
      (this.client = a),
      (this.socket = null),
      (this.ackDatasetID = ""),
      (this.connectionId = ""),
      (this.ackRecieved = !1),
      (this.pendingMessages = {}),
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
    } catch (s) {
      if (s.neuropacsError) throw Error(s.neuropacsError);
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
        await this.initWebSocket(),
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
      this.datasetUpload || (await this.initWebSocket());
    let a = "";
    if (t instanceof Uint8Array) a = this.generateFilename();
    else if (t instanceof File) {
      let i = t instanceof File ? t : await this.readFile(t);
      a = i.name ? i.name : this.generateFilename();
    } else throw { neuropacsError: "Unsupported data type!" };
    let n = { "Content-Disposition": "form-data", filename: a },
      s = "neuropacs----------",
      o = "\r\n",
      c = `--${s}${o}`,
      l = `--${s}--${o}`,
      h = c;
    for (let [d, p] of Object.entries(n)) h += `${d}: ${p};`;
    (h += o),
      (h += "Content-Type: application/octet-stream"),
      (h += `${o}${o}`);
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
    let g = new Uint8Array([...u, ...w, ...new TextEncoder().encode(l)]),
      C = {};
    C = r
      ? {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          "dataset-id": r,
          Client: this.client,
          "order-id": y
        }
      : {
          "Content-Type": "application/octet-stream",
          "connection-id": this.connectionId,
          Client: this.client,
          "order-id": y
        };
    let k = { action: "upload", data: this.uint8ArrayToBase64(g), headers: C };
    return (await this.sendSocketData(k),
    await this.receiveSocketData(),
    this.datasetUpload)
      ? 201
      : (this.disconnectFromSocket(), this.ackDatasetID);
  }
  uint8ArrayToBase64(t) {
    let e = "";
    return (
      t.forEach((t) => {
        e += String.fromCharCode(t);
      }),
      btoa(e)
    );
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
        s = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        o = await fetch(a, { method: "POST", headers: i, body: s });
      if (!o.ok) throw { neuropacsError: `${await o.text()}` };
      return o.status;
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
        s = await fetch(r, { method: "POST", headers: a, body: n });
      if (!s.ok) throw { neuropacsError: `${await s.text()}` };
      let o = await s.text(),
        c = await this.decryptAesCtr(o, this.aesKey, "JSON");
      return c;
    } catch (l) {
      if (l.neuropacsError) throw Error(l.neuropacsError);
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
        s = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        o = await fetch(a, { method: "POST", headers: i, body: s });
      if (!o.ok) throw { neuropacsError: `${await o.text()}` };
      let c = await o.text(),
        l = await this.decryptAesCtr(c, this.aesKey, "string");
      return l;
    } catch (h) {
      if (h.neuropacsError) throw Error(h.neuropacsError);
      throw Error("Result retrieval failed!");
    }
  }
}

module.exports = Neuropacs;
