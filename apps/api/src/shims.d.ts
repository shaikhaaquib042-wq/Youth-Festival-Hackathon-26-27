// workers-types declares `crypto` as a const, so `globalThis.crypto` (used by @raasta/rules) needs this alias.
declare namespace globalThis {
  // eslint-disable-next-line no-var
  var crypto: Crypto;
}
