const fs = require('fs');

function fixMojibake() {
  const c = fs.readFileSync('public/js/components/reminders.js', 'utf8');

  const cp1252ToByte = new Map();
  const cp1252Chars =
    '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009\u000a\u000b\u000c\u000d\u000e\u000f' +
    '\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f' +
    ' !"#$%&\'()*+,-./0123456789:;<=>?' +
    '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
    '`abcdefghijklmnopqrstuvwxyz{|}~\u007f' +
    '\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f' +
    '\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178' +
    '\u00a0\u00a1\u00a2\u00a3\u00a4\u00a5\u00a6\u00a7\u00a8\u00a9\u00aa\u00ab\u00ac\u00ad\u00ae\u00af' +
    '\u00b0\u00b1\u00b2\u00b3\u00b4\u00b5\u00b6\u00b7\u00b8\u00b9\u00ba\u00bb\u00bc\u00bd\u00be\u00bf' +
    '\u00c0\u00c1\u00c2\u00c3\u00c4\u00c5\u00c6\u00c7\u00c8\u00c9\u00ca\u00cb\u00cc\u00cd\u00ce\u00cf' +
    '\u00d0\u00d1\u00d2\u00d3\u00d4\u00d5\u00d6\u00d7\u00d8\u00d9\u00da\u00db\u00dc\u00dd\u00de\u00df' +
    '\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e6\u00e7\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef' +
    '\u00f0\u00f1\u00f2\u00f3\u00f4\u00f5\u00f6\u00f7\u00f8\u00f9\u00fa\u00fb\u00fc\u00fd\u00fe\u00ff';

  for (let i = 0; i < 256; i++) {
    cp1252ToByte.set(cp1252Chars[i], i);
  }

  // Double-encoded utf-8 (mojibake) is usually 2 or 3 bytes long.
  // Our file already had some manual replacements (by the previous node command)
  // that means some characters are valid UTF-8 now, and some are still mojibake.
  // Actually, we can just replace all known patterns.
  // But wait, it's safer to read the file, find valid CP1252 sequences that decode to valid UTF-8,
  // and replace them inline.
  // An easier way: The mojibake in the file consists of sequences of CP1252 characters
  // that correspond to UTF-8 encoded bytes of valid Portuguese characters / emojis.
  
  // Let's decode everything that CAN be decoded as CP1252 -> bytes -> UTF-8 String
  // Wait, if a string is pure ascii, CP1252 -> bytes -> UTF-8 is a no-op visually.
  // Example: "A" -> 0x41 -> "A"
  // but "á" (which is valid now) -> 0xE1 -> "á" (wait, UTF-8 byte 0xE1 is invalid by itself! 0xC3 0xA1 is "á").
  // So if we have a valid "á", converting to bytes gives 0xE1, which is invalid UTF-8.
  
  // Let's create a map of known good unicode -> their mojibake string
  const knownGood = [
      "─", "✅", "⏳", "✨", "Á", "É", "Í", "Ó", "Ú", "Â", "Ê", "Ô", "Ã", "Õ", 
      "á", "é", "í", "ó", "ú", "â", "ê", "ô", "ã", "õ", "ç", "Ç", "✓"
  ];
  
  let newContent = c;
  
  for (const good of knownGood) {
      // get utf8 bytes of 'good'
      let buf = Buffer.from(good, 'utf8');
      // convert each byte to its cp1252 character counterpart (the mojibake)
      let mojibake = '';
      for(let j=0; j<buf.length; j++) {
          mojibake += cp1252Chars[buf[j]];
      }
      
      // Because I might have already "fixed" some words, only replace mojibake instances
      newContent = newContent.split(mojibake).join(good);
  }
  
  // There's a special case, previous regex was a targeted replacement, 
  // so let's just do a blanket replacement of any remaining mojibake.

  const lines = newContent.split('\n');
  console.log('Fixed line 4: ' + lines[4]);
  console.log('Fixed line 24: ' + lines[23]);
  fs.writeFileSync('public/js/components/reminders.js', newContent, 'utf8');
  console.log('File written.');
}

fixMojibake();
