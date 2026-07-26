/* Dependency-free ZIP writer - takes a file-map ({ 'path': 'text contents' }) and returns a Blob of
   a valid .zip. STORE method only (no compression): the deploy console's payloads are small text
   files (a Now SDK project), so DEFLATE would add a lot of code for little benefit; a store-only
   archive is a few dozen lines and every unzip tool reads it. Build-time tooling - never shipped
   into a widget. Runs in a browser (window.SNDeploymentPackager.zip) AND in Node (module.exports, e.g.
   build.js's CLI) - both have global Blob/TextEncoder/Uint32Array, same UMD pattern as
   core.js.

   Format: for each entry a local-file-header + name + raw bytes, then a central-directory header
   per entry, then the end-of-central-directory record. CRC-32 (the one non-trivial bit) is a
   standard table-driven implementation. Text is encoded UTF-8; filenames too. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SNDeploymentPackager = root.SNDeploymentPackager || {};
    root.SNDeploymentPackager.zip = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) { c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); }
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) { c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); }
    return (c ^ 0xffffffff) >>> 0;
  }

  var encoder = new TextEncoder();

  // Little-endian writers into a plain array of bytes.
  function u16(arr, v) { arr.push(v & 0xff, (v >>> 8) & 0xff); }
  function u32(arr, v) { arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff); }
  function bytes(arr, b) { for (var i = 0; i < b.length; i++) { arr.push(b[i]); } }

  // files: { path: contents }. Returns a Blob (application/zip).
  function zip(files) {
    var local = [];       // concatenated local headers + data
    var central = [];     // concatenated central directory headers
    var offset = 0;       // running offset of each local header (for the central dir)
    var count = 0;

    Object.keys(files).forEach(function (path) {
      var nameBytes = encoder.encode(path);
      var dataBytes = encoder.encode(String(files[path] == null ? '' : files[path]));
      var crc = crc32(dataBytes);
      var size = dataBytes.length;

      // local file header (signature 0x04034b50)
      var lh = [];
      u32(lh, 0x04034b50);
      u16(lh, 20);          // version needed
      u16(lh, 0x0800);      // flags: bit 11 = UTF-8 filenames
      u16(lh, 0);           // method: 0 = store
      u16(lh, 0);           // mod time
      u16(lh, 0x21);        // mod date (1980-01-01-ish, arbitrary fixed)
      u32(lh, crc);
      u32(lh, size);        // compressed size (== uncompressed for store)
      u32(lh, size);        // uncompressed size
      u16(lh, nameBytes.length);
      u16(lh, 0);           // extra field length
      bytes(lh, nameBytes);
      bytes(local, lh);
      bytes(local, dataBytes);

      // central directory header (signature 0x02014b50)
      var ch = [];
      u32(ch, 0x02014b50);
      u16(ch, 20);          // version made by
      u16(ch, 20);          // version needed
      u16(ch, 0x0800);      // flags: UTF-8
      u16(ch, 0);           // method: store
      u16(ch, 0);           // mod time
      u16(ch, 0x21);        // mod date
      u32(ch, crc);
      u32(ch, size);
      u32(ch, size);
      u16(ch, nameBytes.length);
      u16(ch, 0);           // extra length
      u16(ch, 0);           // comment length
      u16(ch, 0);           // disk number start
      u16(ch, 0);           // internal attrs
      u32(ch, 0);           // external attrs
      u32(ch, offset);      // relative offset of local header
      bytes(ch, nameBytes);
      bytes(central, ch);

      offset += lh.length + dataBytes.length;
      count++;
    });

    // end of central directory record (signature 0x06054b50)
    var end = [];
    u32(end, 0x06054b50);
    u16(end, 0);            // disk number
    u16(end, 0);            // central dir start disk
    u16(end, count);        // entries on this disk
    u16(end, count);        // total entries
    u32(end, central.length);
    u32(end, offset);       // offset of central dir (== total local size)
    u16(end, 0);            // comment length

    return new Blob([new Uint8Array(local), new Uint8Array(central), new Uint8Array(end)], { type: 'application/zip' });
  }

  return { zip: zip, crc32: crc32 };
});
