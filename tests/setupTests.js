global.fetch = require("cross-fetch");

const crypto = require("crypto").webcrypto;
global.crypto.subtle = crypto.subtle;

const util = require("util");
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;
