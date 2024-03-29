//prettier-ignore

/*!
 * NeuroPACS v1.0.0
 * (c) 2024 Kerrick Cavanaugh
 * Released under the MIT License.
 */
const io = require("../lib/socket.io.min.js");

class Neuropacs {
  constructor(t, e, r = "api") {
    (this.readFileAsArrayBuffer = async (t) =>
      new Promise((e, r) => {
        let a = new FileReader();
        (a.onload = () => e(a.result)), (a.onerror = r), a.readAsArrayBuffer(t);
      })),
      (this.printProgressBar = (t, e, r = 50) => {
        let a = (t / e) * 100,
          n =
            Array(Math.floor((t / e) * r))
              .fill("=")
              .join("") +
            Array(r - Math.floor((t / e) * r))
              .fill(".")
              .join("");
        console.clear(), console.log(`[${n}] ${a.toFixed(2)}%`);
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
          n = window.atob(a),
          i = this.str2ab(n),
          s = await crypto.subtle.importKey(
            "spki",
            i,
            { name: "RSA-OAEP", hash: "SHA-256" },
            !0,
            ["encrypt"]
          ),
          o = await crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            s,
            new TextEncoder().encode(t)
          ),
          l = this.arrayBufferToBase64(o);
        return l;
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
        for (let a = 0, n = t.length; a < n; a++) r[a] = t.charCodeAt(a);
        return e;
      }),
      (this.arrayBufferToBase64 = (t) => {
        let e = new Uint8Array(t);
        return btoa(String.fromCharCode.apply(null, e));
      }),
      (this.encryptAesCtr = async (t, e, r, a) => {
        let n;
        try {
          if ("string" == r && "string" == typeof t)
            n = new TextEncoder().encode(t);
          else if ("JSON" == r) {
            let i = JSON.stringify(t);
            n = new TextEncoder().encode(i);
          } else if ("Uint8Array" == r && t instanceof Uint8Array) n = t;
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
            l = await this.pad(n, 16),
            c = crypto.getRandomValues(new Uint8Array(16)),
            h = await crypto.subtle.importKey(
              "raw",
              o,
              { name: "AES-CTR" },
              !1,
              ["encrypt"]
            ),
            d = await crypto.subtle.encrypt(
              { name: "AES-CTR", counter: c, length: 128 },
              h,
              l
            ),
            p = new Uint8Array(c.length + d.byteLength);
          if ((p.set(c), p.set(new Uint8Array(d), c.length), "string" === a))
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
            n = new Uint8Array(
              atob(t)
                .split("")
                .map((t) => t.charCodeAt(0))
            ),
            i = n.slice(0, 16),
            s = n.slice(16),
            o = await crypto.subtle.importKey(
              "raw",
              a,
              { name: "AES-CTR" },
              !1,
              ["decrypt"]
            ),
            l = await crypto.subtle.decrypt(
              { name: "AES-CTR", counter: i, length: 128 },
              o,
              s
            ),
            c = new TextDecoder().decode(l);
          if ("JSON" === r) return (c = c.trim()), JSON.parse(c);
          if ("string" === r) return c;
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
          n = String(t.getUTCHours()).padStart(2, "0"),
          i = String(t.getUTCMinutes()).padStart(2, "0"),
          s = String(t.getUTCSeconds()).padStart(2, "0"),
          o = `${e}-${r}-${a} ${n}:${i}:${s} UTC`;
        return o;
      }),
      (this.apiKey = e),
      (this.serverUrl = t),
      (this.aesKey = this.generateAesKey()),
      (this.orderId = ""),
      (this.client = r),
      (this.connectionId = ""),
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
      let n = await a.json(),
        i = n.connectionID;
      return (
        (this.connectionId = i),
        {
          timestamp: this.getTimeDateString(),
          connectionId: i,
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
        n = await this.decryptAesCtr(a, this.aesKey, "string");
      return (this.orderId = n), n;
    } catch (i) {
      if (i.neuropacsError) throw Error(i.neuropacsError);
      throw Error("Job creation failed!");
    }
  }
  async uploadDataset(t, e = null) {
    try {
      null == e && (e = this.orderID);
      let r = this.generateUniqueId(); //!Change this
      this.datasetUpload = !0;
      let a = t.length;
      for (let n = 0; n < a; n++) {
        let i = t[n];
        await this.upload(i, r, e), this.printProgressBar(n + 1, a);
      }
      return r;
    } catch (s) {
      if ((console.log(s), s.neuropacsError)) throw Error(s.neuropacsError);
      throw Error("Dataset upload failed!");
    }
  }
  async upload(t, e, r = null) {
    null == r && (r = this.orderId);
    let a = "";
    if (t instanceof Uint8Array) a = this.generateFilename();
    else if (t instanceof File) {
      let n = t instanceof File ? t : await this.readFile(t);
      a = n.name ? n.name : this.generateFilename();
    } else throw { neuropacsError: "Unsupported data type!" };
    let i = await this.encryptAesCtr(r, this.aesKey, "string", "string"),
      s = {
        "Content-Type": "application/octet-stream",
        "connection-id": this.connectionId,
        client: this.client,
        "order-id": i,
        filename: a,
        "dataset-id": e
      },
      o = await fetch(`${this.serverUrl}/api/uploadRequest/`, { headers: s });
    if (!o.ok) throw { neuropacsError: `${await o.text()}` };
    let l = await o.text(),
      c = await this.decryptAesCtr(l, this.aesKey, "JSON"),
      h = c.presignedURL,
      d = { "Content-Disposition": "form-data", filename: a },
      p = "neuropacs----------",
      u = "\r\n",
      y = `--${p}${u}`,
      w = `--${p}--${u}`,
      f = y;
    for (let [g, C] of Object.entries(d)) f += `${g}: ${C};`;
    (f += u),
      (f += "Content-Type: application/octet-stream"),
      (f += `${u}${u}`);
    let m = new TextEncoder().encode(f),
      A;
    if (t instanceof Uint8Array)
      A = await this.encryptAesCtr(t, this.aesKey, "Uint8Array", "bytes");
    else if (t instanceof File) {
      let E = await this.readFileAsArrayBuffer(t);
      A = await this.encryptAesCtr(
        new Uint8Array(E),
        this.aesKey,
        "Uint8Array",
        "bytes"
      );
    } else throw { neuropacsError: "Unsupported data type!" };
    let S = new Uint8Array([...m, ...A, ...new TextEncoder().encode(w)]),
      b = await fetch(h, { method: "PUT", body: S });
    if (!b.ok) throw { neuropacsError: `${await b.text()}` };
    return 201;
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
        n = {
          "Content-Type": "text/plain",
          "Connection-Id": this.connectionId,
          Client: this.client
        },
        i = { orderID: e, productID: t, datasetID: r },
        s = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        o = await fetch(a, { method: "POST", headers: n, body: s });
      if (!o.ok) throw { neuropacsError: `${await o.text()}` };
      return o.status;
    } catch (l) {
      if (l.neuropacsError) throw Error(l.neuropacsError);
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
        n = { orderID: t, datasetID: e },
        i = await this.encryptAesCtr(n, this.aesKey, "JSON", "string"),
        s = await fetch(r, { method: "POST", headers: a, body: i });
      if (!s.ok) throw { neuropacsError: `${await s.text()}` };
      let o = await s.text(),
        l = await this.decryptAesCtr(o, this.aesKey, "JSON");
      return l;
    } catch (c) {
      if (c.neuropacsError) throw Error(c.neuropacsError);
      throw Error("Status check failed.");
    }
  }
  async getResults(t, e = null, r = null) {
    try {
      null == e && (e = this.orderId);
      let a = `${this.serverUrl}/api/getResults/`,
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
      let i = { orderID: e, format: t, datasetID: r },
        s = await this.encryptAesCtr(i, this.aesKey, "JSON", "string"),
        o = await fetch(a, { method: "POST", headers: n, body: s });
      if (!o.ok) throw { neuropacsError: `${await o.text()}` };
      let l = await o.text(),
        c = await this.decryptAesCtr(l, this.aesKey, "string");
      return c;
    } catch (h) {
      if (h.neuropacsError) throw Error(h.neuropacsError);
      throw Error("Result retrieval failed!");
    }
  }
}

module.exports = Neuropacs;
