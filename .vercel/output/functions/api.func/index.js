import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY2 = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY2.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults3 = require_defaults();
    var { isDate } = __require("util/types");
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (defaults3.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier2 = function(str2) {
      return '"' + str2.replace(/"/g, '""') + '"';
    };
    var escapeLiteral2 = function(str2) {
      let hasBackslash = false;
      let escaped = "'";
      if (str2 == null) {
        return "''";
      }
      if (typeof str2 !== "string") {
        return "''";
      }
      for (let i = 0; i < str2.length; i++) {
        const c = str2[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes: randomBytes2,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes2(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https: return//github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto2 = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto2.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto2.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto2.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto2.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto2.sha256(clientKey);
      const clientSignature = await crypto2.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto2.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto2.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides2;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str2, options = {}) {
      if (str2.charAt(0) === "/") {
        const config2 = str2.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str2)) {
        str2 = encodeURI(str2).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str2, "postgres://base");
        } catch (e) {
          result = new URL(str2.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs3 = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs3.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs3.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs3.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str2) {
      return toClientConfig(parse(str2));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults3 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults3[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults3.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result2;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter } = __require("events");
    var Result2 = require_result();
    var utils = require_utils();
    var Query2 = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name]);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query2;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32PrefixedString(mappedVal);
        }
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper);
      } catch (err) {
        writer.clear();
        paramWriter.clear();
        throw err;
      }
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = void 0;
    exports.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/pg-cloudflare/dist/empty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = __require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection2;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop2(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop2;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop2;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path5 = __require("path");
    var Stream2 = __require("stream").Stream;
    var split = require_split2();
    var util = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream2 && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path5.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path5.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path5 = __require("path");
    var fs3 = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs3.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs3.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports, module) {
    var EventEmitter = __require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = __require("util");
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults3 = require_defaults();
    var Connection2 = require_connection();
    var crypto2 = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults3.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto2.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str2) {
        return utils.escapeIdentifier(str2);
      }
      escapeLiteral(str2) {
        return utils.escapeLiteral(str2);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query2(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query2;
    module.exports = Client2;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify2(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool3 = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify2(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify2(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify2(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify2(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool3;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports, module) {
    var nodeUtils = __require("util");
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides2(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._pulsePipelinedQueryQueue();
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client2 = require_client();
    var defaults3 = require_defaults();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils();
    var Pool3 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool3 {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults3;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module.exports = new PG(clientConstructor);
    Object.defineProperty(module.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// src/repositories.mjs
import { randomUUID } from "crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
var isTestEnv = () => process.env.NODE_ENV === "test" || process.env.IS_TEST === "true" || process.argv.some((a) => String(a).includes("test"));
var STORE_PATH = process.env.VARIS_STORE_PATH || path.join(os.tmpdir(), "varis_store.json");
function loadDiskStore() {
  if (isTestEnv()) return null;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch {
  }
  return null;
}
function saveDiskStore(data) {
  if (isTestEnv()) return;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch {
  }
}
var globalRepoInstance = null;
function getGlobalRepositories(pool = null) {
  if (!globalRepoInstance) {
    globalRepoInstance = createRepositories(pool);
  }
  return globalRepoInstance;
}
var DEFAULT_AI_MODELS = [
  {
    id: "auto",
    provider_id: "system",
    display_name: "VARIS Auto Router",
    description: "Otomatis memilih model tercepat dan paling cerdas sesuai tingkat kesulitan pertanyaan.",
    badge: "Smart",
    speed: "Lightning",
    reasoning: "Expert",
    context_window: "1M tokens",
    tier_required: "free",
    credit_cost_per_request: 3,
    status: "available",
    is_enabled: true,
    is_default: true,
    sort_order: 0
  },
  {
    id: "gemini-2.0-flash",
    provider_id: "google",
    display_name: "Gemini 2.0 Flash",
    description: "Model generasi terbaru Google dengan kecepatan ultra-tinggi dan penalaran tajam.",
    badge: "Speed",
    speed: "Lightning",
    reasoning: "Advanced",
    context_window: "1M tokens",
    tier_required: "free",
    credit_cost_per_request: 3,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 1
  },
  {
    id: "gemini-1.5-pro",
    provider_id: "google",
    display_name: "Gemini 1.5 Pro",
    description: "Model reasoning mendalam Google untuk pemecahan masalah kompleks dan analisis dokumen.",
    badge: "Deep Think",
    speed: "Standard",
    reasoning: "Expert",
    context_window: "2M tokens",
    tier_required: "pro",
    credit_cost_per_request: 12,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 2
  },
  {
    id: "gpt-4o-mini",
    provider_id: "openai",
    display_name: "GPT-4o Mini",
    description: "Model efisien dan cerdas dari OpenAI untuk percakapan lisan dan coding cepat.",
    badge: "Fast",
    speed: "Fast",
    reasoning: "Advanced",
    context_window: "128k tokens",
    tier_required: "free",
    credit_cost_per_request: 4,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 3
  },
  {
    id: "gpt-4o",
    provider_id: "openai",
    display_name: "GPT-4o Omnimodel",
    description: "Model unggulan flagship OpenAI dengan kapabilitas analitis dan coding kelas dunia.",
    badge: "Flagship",
    speed: "Fast",
    reasoning: "Expert",
    context_window: "128k tokens",
    tier_required: "pro",
    credit_cost_per_request: 15,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 4
  },
  {
    id: "o3-mini",
    provider_id: "openai",
    display_name: "o3-mini Reasoning",
    description: "Model penalaran bertahap (reasoning/thinking) khusus untuk logika matematika dan arsitektur kode.",
    badge: "Reasoning",
    speed: "Standard",
    reasoning: "Expert",
    context_window: "200k tokens",
    tier_required: "ultra",
    credit_cost_per_request: 25,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 5
  },
  {
    id: "llama-3.3-70b",
    provider_id: "groq",
    display_name: "Llama 3.3 70B",
    description: "Model open-weights performa tinggi dengan inferensi kilat di infrastruktur Groq LPU.",
    badge: "Groq Speed",
    speed: "Lightning",
    reasoning: "Advanced",
    context_window: "128k tokens",
    tier_required: "free",
    credit_cost_per_request: 3,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 6
  },
  {
    id: "llama-3.1-8b",
    provider_id: "groq",
    display_name: "Llama 3.1 8B Instant",
    description: "Model ultra-cepat dengan respon instan dan latensi terendah.",
    badge: "Instant",
    speed: "Instant",
    reasoning: "Standard",
    context_window: "128k tokens",
    tier_required: "free",
    credit_cost_per_request: 2,
    status: "available",
    is_enabled: true,
    is_default: false,
    sort_order: 7
  }
];
var DEFAULT_PLANS = [
  {
    id: "free",
    name: "Free Starter",
    description: "Akses model dasar untuk mencoba kemampuan VARIS.",
    monthly_credits: 100,
    daily_credit_limit: 50,
    rate_limit_rpm: 10,
    can_use_comparison: false,
    allowed_tiers: ["free"]
  },
  {
    id: "pro",
    name: "Pro Developer",
    description: "Akses model profesional untuk coding, reasoning, dan percakapan cerdas.",
    monthly_credits: 5e3,
    daily_credit_limit: 2e3,
    rate_limit_rpm: 30,
    can_use_comparison: true,
    allowed_tiers: ["free", "pro"]
  },
  {
    id: "ultra",
    name: "Ultra AI Power",
    description: "Akses prioritas penuh ke seluruh model advanced reasoning & multi-model comparison.",
    monthly_credits: 2e4,
    daily_credit_limit: 1e4,
    rate_limit_rpm: 60,
    can_use_comparison: true,
    allowed_tiers: ["free", "pro", "ultra"]
  }
];
var DEFAULT_PROJECTS = [
  {
    id: "proj-1",
    name: "VARIS Website",
    description: "Next-generation AI Workspace frontend & documentation portal.",
    file_count: 12,
    created_at: new Date(Date.now() - 7 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 2 * 36e5).toISOString()
  },
  {
    id: "proj-2",
    name: "Design System",
    description: "Minimalist, light-themed Figma tokens and component library.",
    file_count: 8,
    created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 4 * 36e5).toISOString()
  },
  {
    id: "proj-3",
    name: "AI Analytics Engine",
    description: "Multi-model usage aggregation and credit calculation service.",
    file_count: 6,
    created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 1 * 864e5).toISOString()
  }
];
var DEFAULT_FILES = [
  {
    id: "file-1",
    name: "Project Proposal.pdf",
    project_id: "proj-1",
    project_name: "Project A",
    type: "PDF",
    size_bytes: 2516582,
    size_formatted: "2.4 MB",
    content: "Proposal overview for VARIS AI Multi-Model Platform rollout with executive summary and key milestones.",
    created_at: new Date(Date.now() - 2 * 36e5).toISOString(),
    updated_at: new Date(Date.now() - 2 * 36e5).toISOString()
  },
  {
    id: "file-2",
    name: "Design System.fig",
    project_id: "proj-2",
    project_name: "Design",
    type: "Figma",
    size_bytes: 6081740,
    size_formatted: "5.8 MB",
    content: "Figma visual design system tokens, typography scales, light-theme palette, and 3D glass asset specs.",
    created_at: new Date(Date.now() - 4 * 36e5).toISOString(),
    updated_at: new Date(Date.now() - 4 * 36e5).toISOString()
  },
  {
    id: "file-3",
    name: "API Documentation.md",
    project_id: "proj-1",
    project_name: "Development",
    type: "MD",
    size_bytes: 1258291,
    size_formatted: "1.2 MB",
    content: "# VARIS AI REST & Streaming API Documentation\n\nComprehensive endpoints for /api/chat, /api/models, /api/files, and /api/auth/google.",
    created_at: new Date(Date.now() - 5 * 36e5).toISOString(),
    updated_at: new Date(Date.now() - 5 * 36e5).toISOString()
  },
  {
    id: "file-4",
    name: "Marketing Plan.docx",
    project_id: "proj-1",
    project_name: "Marketing",
    type: "DOCX",
    size_bytes: 2202009,
    size_formatted: "2.1 MB",
    content: "Global launch strategy, product hunt campaign, developer community outreach, and SaaS pricing rollout.",
    created_at: new Date(Date.now() - 24 * 36e5).toISOString(),
    updated_at: new Date(Date.now() - 24 * 36e5).toISOString()
  },
  {
    id: "file-5",
    name: "hero_glass_orb.png",
    project_id: "proj-2",
    project_name: "Design",
    type: "Image",
    size_bytes: 4508876,
    size_formatted: "4.3 MB",
    content: "High-resolution rendered 3D transparent glass orb with iridescent reflections and metallic orbital rings.",
    created_at: new Date(Date.now() - 24 * 36e5).toISOString(),
    updated_at: new Date(Date.now() - 24 * 36e5).toISOString()
  }
];
function createRepositories(pool) {
  const disk = loadDiskStore() || {};
  const users = disk.users || [];
  const sessions = disk.sessions || [];
  const conversations = disk.conversations || [];
  const messages = disk.messages || [];
  const preferences = disk.preferences || [];
  const voiceProfiles = disk.voiceProfiles || [];
  const memoryItems = disk.memoryItems || [];
  const aiModels = disk.aiModels || DEFAULT_AI_MODELS.map((m) => ({ ...m, created_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() }));
  const subscriptionPlans = disk.subscriptionPlans || DEFAULT_PLANS.map((p) => ({ ...p, created_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() }));
  const projects = disk.projects || DEFAULT_PROJECTS.map((p) => ({ ...p }));
  const files = disk.files || DEFAULT_FILES.map((f) => ({ ...f }));
  const userSubscriptions = disk.userSubscriptions || [];
  const userCredits = disk.userCredits || [];
  const creditTransactions = disk.creditTransactions || [];
  const usageLogs = disk.usageLogs || [];
  const researchSessions = disk.researchSessions || [];
  const searchResults = disk.searchResults || [];
  const modelUsages = disk.modelUsages || [];
  const syncFromDisk = () => {
    const latest = loadDiskStore();
    if (!latest) return;
    if (latest.users) {
      users.length = 0;
      users.push(...latest.users);
    }
    if (latest.sessions) {
      sessions.length = 0;
      sessions.push(...latest.sessions);
    }
    if (latest.conversations) {
      conversations.length = 0;
      conversations.push(...latest.conversations);
    }
    if (latest.messages) {
      messages.length = 0;
      messages.push(...latest.messages);
    }
    if (latest.preferences) {
      preferences.length = 0;
      preferences.push(...latest.preferences);
    }
    if (latest.voiceProfiles) {
      voiceProfiles.length = 0;
      voiceProfiles.push(...latest.voiceProfiles);
    }
    if (latest.memoryItems) {
      memoryItems.length = 0;
      memoryItems.push(...latest.memoryItems);
    }
    if (latest.userSubscriptions) {
      userSubscriptions.length = 0;
      userSubscriptions.push(...latest.userSubscriptions);
    }
    if (latest.userCredits) {
      userCredits.length = 0;
      userCredits.push(...latest.userCredits);
    }
    if (latest.creditTransactions) {
      creditTransactions.length = 0;
      creditTransactions.push(...latest.creditTransactions);
    }
    if (latest.projects) {
      projects.length = 0;
      projects.push(...latest.projects);
    }
    if (latest.files) {
      files.length = 0;
      files.push(...latest.files);
    }
    if (latest.researchSessions) {
      researchSessions.length = 0;
      researchSessions.push(...latest.researchSessions);
    }
    if (latest.searchResults) {
      searchResults.length = 0;
      searchResults.push(...latest.searchResults);
    }
    if (latest.modelUsages) {
      modelUsages.length = 0;
      modelUsages.push(...latest.modelUsages);
    }
  };
  const persistToDisk = () => {
    saveDiskStore({
      users,
      sessions,
      conversations,
      messages,
      preferences,
      voiceProfiles,
      memoryItems,
      aiModels,
      subscriptionPlans,
      projects,
      files,
      userSubscriptions,
      userCredits,
      creditTransactions,
      usageLogs,
      researchSessions,
      searchResults,
      modelUsages
    });
  };
  const memRepo = {
    async findUserByEmail(email) {
      syncFromDisk();
      return users.find((u) => u.email === (email || "").trim().toLowerCase()) ?? null;
    },
    async findUserById(id) {
      syncFromDisk();
      return users.find((u) => u.id === id) ?? null;
    },
    async findUserByGoogleId(googleId) {
      if (!googleId) return null;
      syncFromDisk();
      return users.find((u) => u.google_id === googleId) ?? null;
    },
    async createUser({ name, email, passwordHash = null, googleId = null, avatarUrl = null, authProvider = "local" }) {
      syncFromDisk();
      const user = {
        id: randomUUID(),
        name,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        google_id: googleId,
        avatar_url: avatarUrl,
        auth_provider: authProvider,
        last_login_at: (/* @__PURE__ */ new Date()).toISOString(),
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      users.push(user);
      userSubscriptions.push({
        id: randomUUID(),
        user_id: user.id,
        plan_id: "free",
        current_period_start: (/* @__PURE__ */ new Date()).toISOString(),
        current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
        status: "active"
      });
      userCredits.push({
        id: randomUUID(),
        user_id: user.id,
        balance: 100,
        allocated_monthly: 100,
        reserved: 0,
        last_reset_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      creditTransactions.push({
        id: randomUUID(),
        user_id: user.id,
        model_id: "system",
        provider: "system",
        type: "monthly_grant",
        credits: 100,
        balance_after: 100,
        input_tokens: 0,
        output_tokens: 0,
        details: { note: "Initial free plan registration grant" },
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      persistToDisk();
      return user;
    },
    async createGoogleUser({ googleId, name, email, avatarUrl }) {
      return memRepo.createUser({
        name,
        email,
        passwordHash: null,
        googleId,
        avatarUrl,
        authProvider: "google"
      });
    },
    async linkGoogleAccount(userId, { googleId, avatarUrl }) {
      syncFromDisk();
      const user = users.find((u) => u.id === userId);
      if (!user) return null;
      user.google_id = googleId;
      if (!user.avatar_url && avatarUrl) user.avatar_url = avatarUrl;
      user.auth_provider = user.password_hash ? "both" : "google";
      user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      user.last_login_at = (/* @__PURE__ */ new Date()).toISOString();
      persistToDisk();
      return user;
    },
    async updateUserLastLogin(userId) {
      syncFromDisk();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.last_login_at = (/* @__PURE__ */ new Date()).toISOString();
        user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
      }
      return user;
    },
    async updateUserAvatar(userId, avatarUrl) {
      syncFromDisk();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.avatar_url = avatarUrl;
        user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
      }
      return user;
    },
    async updateUserName(userId, name) {
      syncFromDisk();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.name = name;
        user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
      }
      return user;
    },
    async updateUserPassword(userId, passwordHash) {
      syncFromDisk();
      const user = users.find((u) => u.id === userId);
      if (user) {
        user.password_hash = passwordHash;
        user.auth_provider = user.google_id ? "both" : "local";
        user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
      }
      return user;
    },
    async resetPasswordByEmail(email, passwordHash) {
      syncFromDisk();
      const user = users.find((u) => u.email === (email || "").trim().toLowerCase());
      if (user) {
        user.password_hash = passwordHash;
        user.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
        return user;
      }
      return null;
    },
    async createSession({ userId, tokenHash, expiresAt }) {
      syncFromDisk();
      const user = users.find((u) => u.id === userId);
      sessions.push({
        id: randomUUID(),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        revoked_at: null,
        name: user?.name,
        email: user?.email,
        avatar_url: user?.avatar_url,
        auth_provider: user?.auth_provider || "local",
        google_id: user?.google_id,
        last_login_at: user?.last_login_at,
        user_created_at: user?.created_at,
        user_updated_at: user?.updated_at
      });
      persistToDisk();
    },
    async findSession(tokenHash) {
      syncFromDisk();
      const s = sessions.find((s2) => s2.token_hash === tokenHash && !s2.revoked_at && new Date(s2.expires_at) > /* @__PURE__ */ new Date());
      return s ?? null;
    },
    async findSessionByTokenHash(tokenHash) {
      return memRepo.findSession(tokenHash);
    },
    async touchSession(id) {
      syncFromDisk();
      const s = sessions.find((s2) => s2.id === id);
      if (s) {
        s.last_seen_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
      }
    },
    async revokeSession(tokenHash) {
      syncFromDisk();
      const s = sessions.find((s2) => s2.token_hash === tokenHash);
      if (s) {
        s.revoked_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
      }
    },
    async listConversations(userId) {
      syncFromDisk();
      return conversations.filter((c) => c.user_id === userId).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
    async createConversation(userId, title) {
      syncFromDisk();
      const conv = { id: randomUUID(), user_id: userId, title, created_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      conversations.push(conv);
      persistToDisk();
      return conv;
    },
    async getConversation(userId, id) {
      syncFromDisk();
      return conversations.find((c) => c.id === id && c.user_id === userId) ?? null;
    },
    async deleteConversation(userId, id) {
      syncFromDisk();
      const idx = conversations.findIndex((c) => c.id === id && c.user_id === userId);
      if (idx !== -1) {
        conversations.splice(idx, 1);
        persistToDisk();
        return true;
      }
      return false;
    },
    async listMessages(userId, conversationId) {
      syncFromDisk();
      return messages.filter((m) => m.conversation_id === conversationId && m.user_id === userId).sort((a, b) => a.sequence_no - b.sequence_no);
    },
    async listRecentMessages(userId, conversationId, limit2 = 20) {
      syncFromDisk();
      const list = messages.filter((m) => m.conversation_id === conversationId && m.user_id === userId).sort((a, b) => b.sequence_no - a.sequence_no).slice(0, limit2);
      return list.reverse();
    },
    async createMessage(userId, conversationId, role, content, metadata = {}) {
      syncFromDisk();
      const seq = messages.filter((m) => m.conversation_id === conversationId).length + 1;
      const msg = {
        id: metadata.id || metadata.messageId || randomUUID(),
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        sequence_no: seq,
        provider: metadata.provider || null,
        model: metadata.model || null,
        input_tokens: metadata.inputTokens ?? null,
        output_tokens: metadata.outputTokens ?? null,
        total_tokens: metadata.inputTokens != null && metadata.outputTokens != null ? metadata.inputTokens + metadata.outputTokens : null,
        latency_ms: metadata.latencyMs ?? null,
        request_id: metadata.requestId ?? null,
        research_session_id: metadata.researchSessionId ?? null,
        source_ids: metadata.sourceIds ?? [],
        sources: metadata.sources ?? [],
        search_mode: metadata.searchMode ?? null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      messages.push(msg);
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) conv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      persistToDisk();
      return msg;
    },
    async getPreferences(userId) {
      syncFromDisk();
      return preferences.find((p) => p.user_id === userId) ?? null;
    },
    async upsertPreferences(userId, data) {
      syncFromDisk();
      let pref = preferences.find((p) => p.user_id === userId);
      if (!pref) {
        pref = { id: randomUUID(), user_id: userId, voice_profile_id: data.voice_profile_id ?? null, speaking_speed: data.speaking_speed, voice_style: data.voice_style ?? {}, language: data.language, created_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        preferences.push(pref);
      } else {
        pref.voice_profile_id = data.voice_profile_id ?? null;
        pref.speaking_speed = data.speaking_speed;
        pref.voice_style = data.voice_style ?? {};
        pref.language = data.language;
        pref.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      persistToDisk();
      return pref;
    },
    async listVoiceProfiles(userId) {
      syncFromDisk();
      return voiceProfiles.filter((v) => v.user_id === userId && (v.status === "active" || v.status === "pending"));
    },
    async createVoiceProfile(userId, provider, providerVoiceId, name, status = "active") {
      syncFromDisk();
      const vp = { id: randomUUID(), user_id: userId, provider, provider_voice_id: providerVoiceId, name, status, created_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      voiceProfiles.push(vp);
      persistToDisk();
      return vp;
    },
    async getVoiceProfile(userId, id) {
      syncFromDisk();
      return voiceProfiles.find((v) => v.id === id && v.user_id === userId) ?? null;
    },
    async deleteVoiceProfile(userId, id) {
      syncFromDisk();
      const vp = voiceProfiles.find((v) => v.id === id && v.user_id === userId);
      if (vp) {
        vp.status = "deleted";
        persistToDisk();
        return true;
      }
      return false;
    },
    async createMemory({ userId, text, kind = "fact", confidence = 1, sensitivity = "normal" }) {
      syncFromDisk();
      const mem = { id: randomUUID(), user_id: userId, text, kind, confidence, sensitivity, created_at: (/* @__PURE__ */ new Date()).toISOString() };
      memoryItems.push(mem);
      persistToDisk();
      return mem;
    },
    async updateMemory(userId, memoryId, text) {
      syncFromDisk();
      const mem = memoryItems.find((m) => m.id === memoryId && m.user_id === userId);
      if (mem) {
        mem.text = text;
        mem.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
        return mem;
      }
      return null;
    },
    async deleteMemory(userId, memoryId) {
      syncFromDisk();
      const idx = memoryItems.findIndex((m) => m.id === memoryId && m.user_id === userId);
      if (idx !== -1) {
        memoryItems.splice(idx, 1);
        persistToDisk();
        return true;
      }
      return false;
    },
    async searchMemories(userId, embedding, limit2 = 5) {
      syncFromDisk();
      return memoryItems.filter((m) => m.user_id === userId).slice(0, limit2).map((m) => ({ ...m, similarity: 0.9 }));
    },
    async getMemory(userId, memoryId) {
      syncFromDisk();
      return memoryItems.find((m) => m.id === memoryId && m.user_id === userId) ?? null;
    },
    // ================= Multi-Model AI Repositories =================
    async listAIModels() {
      syncFromDisk();
      return [...aiModels].sort((a, b) => a.sort_order - b.sort_order);
    },
    async getAIModel(id) {
      syncFromDisk();
      return aiModels.find((m) => m.id === id) ?? null;
    },
    async upsertAIModel(data) {
      syncFromDisk();
      let m = aiModels.find((item) => item.id === data.id);
      if (!m) {
        m = { ...data, created_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        aiModels.push(m);
      } else {
        Object.assign(m, data);
        m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      persistToDisk();
      return m;
    },
    async updateAIModelStatus(id, status) {
      syncFromDisk();
      const m = aiModels.find((item) => item.id === id);
      if (m) {
        m.status = status;
        m.updated_at = (/* @__PURE__ */ new Date()).toISOString();
        persistToDisk();
        return m;
      }
      return null;
    },
    // ================= Subscription & Credit Repositories =================
    async listSubscriptionPlans() {
      syncFromDisk();
      return [...subscriptionPlans];
    },
    async getSubscriptionPlan(id) {
      syncFromDisk();
      return subscriptionPlans.find((p) => p.id === id) ?? null;
    },
    async getUserSubscription(userId) {
      syncFromDisk();
      let sub = userSubscriptions.find((s) => s.user_id === userId);
      if (!sub) {
        sub = {
          id: randomUUID(),
          user_id: userId,
          plan_id: "free",
          current_period_start: (/* @__PURE__ */ new Date()).toISOString(),
          current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
          status: "active"
        };
        userSubscriptions.push(sub);
        persistToDisk();
      }
      const plan = subscriptionPlans.find((p) => p.id === sub.plan_id) || subscriptionPlans[0];
      return { ...sub, plan };
    },
    async setUserSubscription(userId, planId) {
      syncFromDisk();
      const plan = subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0];
      let sub = userSubscriptions.find((s) => s.user_id === userId);
      if (!sub) {
        sub = {
          id: randomUUID(),
          user_id: userId,
          plan_id: planId,
          current_period_start: (/* @__PURE__ */ new Date()).toISOString(),
          current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
          status: "active"
        };
        userSubscriptions.push(sub);
      } else {
        sub.plan_id = planId;
        sub.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      let cred = userCredits.find((c) => c.user_id === userId);
      if (!cred) {
        cred = {
          id: randomUUID(),
          user_id: userId,
          balance: plan.monthly_credits,
          allocated_monthly: plan.monthly_credits,
          reserved: 0,
          last_reset_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        userCredits.push(cred);
      } else {
        cred.balance = Math.max(cred.balance, plan.monthly_credits);
        cred.allocated_monthly = plan.monthly_credits;
        cred.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      persistToDisk();
      return { ...sub, plan };
    },
    async getUserCredits(userId) {
      syncFromDisk();
      let cred = userCredits.find((c) => c.user_id === userId);
      if (!cred) {
        cred = {
          id: randomUUID(),
          user_id: userId,
          balance: 100,
          allocated_monthly: 100,
          reserved: 0,
          last_reset_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        userCredits.push(cred);
        persistToDisk();
      }
      return { ...cred };
    },
    async reserveCredits(userId, amount) {
      syncFromDisk();
      let cred = userCredits.find((c) => c.user_id === userId);
      if (!cred) {
        cred = { id: randomUUID(), user_id: userId, balance: 100, allocated_monthly: 100, reserved: 0, last_reset_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        userCredits.push(cred);
      }
      const available = cred.balance - (cred.reserved || 0);
      if (available < amount) {
        return { ok: false, balance: cred.balance, available, required: amount };
      }
      cred.reserved = (cred.reserved || 0) + amount;
      cred.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      persistToDisk();
      const reservationId = randomUUID();
      return { ok: true, reservationId, reservedAmount: amount, available: cred.balance - cred.reserved };
    },
    async settleCredits({ userId, reservedAmount = 0, actualAmount = 0, modelId = "auto", provider = "system", conversationId = null, messageId = null, inputTokens = 0, outputTokens = 0, details = {} }) {
      syncFromDisk();
      let cred = userCredits.find((c) => c.user_id === userId);
      if (!cred) {
        cred = { id: randomUUID(), user_id: userId, balance: 100, allocated_monthly: 100, reserved: 0, last_reset_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        userCredits.push(cred);
      }
      cred.reserved = Math.max(0, (cred.reserved || 0) - reservedAmount);
      cred.balance = Math.max(0, cred.balance - actualAmount);
      cred.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      const tx = {
        id: randomUUID(),
        user_id: userId,
        conversation_id: conversationId,
        message_id: messageId,
        model_id: modelId,
        provider,
        type: "deduct",
        credits: actualAmount,
        balance_after: cred.balance,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        details,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      creditTransactions.push(tx);
      usageLogs.push({
        id: randomUUID(),
        user_id: userId,
        model_id: modelId,
        provider,
        credits_used: actualAmount,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        tools_used: details.tools || [],
        duration_ms: details.durationMs || 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      persistToDisk();
      return { ok: true, balance: cred.balance, deducted: actualAmount, transactionId: tx.id };
    },
    async refundCredits({ userId, reservedAmount = 0, reason = "Request failed" }) {
      syncFromDisk();
      let cred = userCredits.find((c) => c.user_id === userId);
      if (cred && reservedAmount > 0) {
        cred.reserved = Math.max(0, (cred.reserved || 0) - reservedAmount);
        cred.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      return { ok: true, balance: cred?.balance ?? 0, refunded: reservedAmount, reason };
    },
    async listCreditTransactions(userId, limit2 = 50) {
      return creditTransactions.filter((t) => t.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit2);
    },
    async getUserUsageStats(userId) {
      const now = /* @__PURE__ */ new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const userLogs = usageLogs.filter((l) => l.user_id === userId);
      const todayLogs = userLogs.filter((l) => l.created_at.startsWith(todayStr));
      const modelCounts = {};
      let totalCreditsUsed = 0;
      let totalTokens = 0;
      for (const log of userLogs) {
        modelCounts[log.model_id] = (modelCounts[log.model_id] || 0) + 1;
        totalCreditsUsed += log.credits_used || 0;
        totalTokens += (log.input_tokens || 0) + (log.output_tokens || 0);
      }
      const totalReq = userLogs.length || 1;
      const modelBreakdown = Object.entries(modelCounts).map(([model_id, count]) => ({
        model_id,
        count,
        percentage: Math.round(count / totalReq * 100)
      })).sort((a, b) => b.count - a.count);
      const cred = userCredits.find((c) => c.user_id === userId) || { balance: 100, allocated_monthly: 100 };
      const sub = userSubscriptions.find((s) => s.user_id === userId) || { plan_id: "free", current_period_end: new Date(Date.now() + 30 * 864e5).toISOString() };
      return {
        requests_today: todayLogs.length,
        requests_this_month: userLogs.length,
        credits_used: totalCreditsUsed,
        credits_remaining: cred.balance,
        credits_allocated: cred.allocated_monthly,
        total_tokens: totalTokens,
        model_breakdown: modelBreakdown,
        plan_id: sub.plan_id,
        period_end: sub.current_period_end
      };
    },
    async getAdminStats() {
      return {
        total_users: users.length,
        total_requests: usageLogs.length,
        total_credits_consumed: usageLogs.reduce((acc, l) => acc + (l.credits_used || 0), 0),
        active_models: aiModels.filter((m) => m.is_enabled).length
      };
    },
    // Projects CRUD
    async listProjects(userId) {
      return [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
    async createProject(userId, { name, description = "" }) {
      const proj = {
        id: "proj-" + randomUUID().slice(0, 8),
        name: name.trim(),
        description: description.trim(),
        file_count: 0,
        user_id: userId,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      projects.unshift(proj);
      return proj;
    },
    async getProject(userId, id) {
      const proj = projects.find((p) => p.id === id);
      if (!proj) return null;
      const projFiles = files.filter((f) => f.project_id === id);
      return { ...proj, files: projFiles };
    },
    async deleteProject(userId, id) {
      const idx = projects.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      projects.splice(idx, 1);
      return true;
    },
    // Files CRUD
    async listFiles(userId, { type = "all", projectId = null, search = "" } = {}) {
      let result2 = [...files];
      if (projectId) {
        result2 = result2.filter((f) => f.project_id === projectId);
      }
      if (type && type !== "all") {
        const typeNorm = type.toLowerCase();
        if (typeNorm === "documents" || typeNorm === "document") {
          result2 = result2.filter((f) => ["pdf", "docx", "doc", "txt", "md"].includes(f.type.toLowerCase()));
        } else if (typeNorm === "images" || typeNorm === "image") {
          result2 = result2.filter((f) => ["image", "png", "jpg", "jpeg", "svg", "webp"].includes(f.type.toLowerCase()));
        } else if (typeNorm === "code") {
          result2 = result2.filter((f) => ["code", "js", "ts", "mjs", "json", "py", "fig"].includes(f.type.toLowerCase()));
        } else {
          result2 = result2.filter((f) => f.type.toLowerCase() === typeNorm);
        }
      }
      if (search && search.trim()) {
        const q2 = search.trim().toLowerCase();
        result2 = result2.filter((f) => f.name.toLowerCase().includes(q2) || f.project_name && f.project_name.toLowerCase().includes(q2));
      }
      return result2.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
    async createFile(userId, { name, projectId = "proj-1", projectName = "Project", type = "Document", sizeBytes = 1024, sizeFormatted = "1 KB", content = "" }) {
      const ext = name.split(".").pop()?.toUpperCase() || type;
      const file = {
        id: "file-" + randomUUID().slice(0, 8),
        name: name.trim(),
        project_id: projectId,
        project_name: projectName,
        type: ext,
        size_bytes: sizeBytes,
        size_formatted: sizeFormatted,
        content: content || "Uploaded file content ready for AI analysis.",
        user_id: userId,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      files.unshift(file);
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        proj.file_count = (proj.file_count || 0) + 1;
        proj.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      return file;
    },
    async getFile(userId, id) {
      return files.find((f) => f.id === id) ?? null;
    },
    async deleteFile(userId, id) {
      const idx = files.findIndex((f) => f.id === id);
      if (idx === -1) return false;
      const deleted = files.splice(idx, 1)[0];
      const proj = projects.find((p) => p.id === deleted.project_id);
      if (proj && proj.file_count > 0) {
        proj.file_count -= 1;
      }
      return true;
    },
    // Subscription Upgrade
    async upgradeUserSubscription(userId, planId) {
      return memRepo.setUserSubscription(userId, planId);
    },
    // Research Sessions & Search Results
    async createResearchSession({ userId, conversationId = null, query = "", searchMode = "always" } = {}) {
      const session = {
        id: `rs_${randomUUID()}`,
        user_id: userId,
        conversation_id: conversationId,
        query,
        search_mode: searchMode,
        status: "in_progress",
        sources_count: 0,
        latency_ms: 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        completed_at: null
      };
      researchSessions.unshift(session);
      return session;
    },
    async completeResearchSession(id, { sourcesCount = 0, latencyMs = 0, status = "completed", details = {} } = {}) {
      const session = researchSessions.find((s) => s.id === id);
      if (session) {
        session.sources_count = sourcesCount;
        session.latency_ms = latencyMs;
        session.status = status;
        session.details = details;
        session.completed_at = (/* @__PURE__ */ new Date()).toISOString();
        return session;
      }
      return null;
    },
    async getResearchSession(id) {
      return researchSessions.find((s) => s.id === id) ?? null;
    },
    async createSearchResults(sessionId, sources = []) {
      const saved = [];
      for (const src of sources) {
        const item = {
          id: src.id || `sr_${randomUUID()}`,
          research_session_id: sessionId,
          title: src.title,
          url: src.url,
          domain: src.domain,
          snippet: src.snippet,
          content: src.content || src.snippet,
          relevance_score: src.relevanceScore || 0.85,
          published_at: src.publishedAt || null,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        searchResults.push(item);
        saved.push(item);
      }
      return saved;
    },
    async getSearchResults(sessionId) {
      return searchResults.filter((s) => s.research_session_id === sessionId);
    },
    // Model Usage Audit Logs
    async recordModelUsage({ userId, conversationId = null, requestId = `req_${randomUUID()}`, modelId = "auto", provider = "system", inputTokens = 0, outputTokens = 0, latencyMs = 0, status = "success", errorMessage = null } = {}) {
      const usage = {
        id: `usage_${randomUUID()}`,
        user_id: userId,
        conversation_id: conversationId,
        request_id: requestId,
        model_id: modelId,
        provider,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        latency_ms: latencyMs,
        status,
        error_message: errorMessage,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      modelUsages.push(usage);
      return usage;
    },
    async getModelUsage(requestId) {
      return modelUsages.find((u) => u.request_id === requestId) ?? null;
    }
  };
  if (!pool) return memRepo;
  const q = async (text, values = []) => {
    try {
      return await pool.query(text, values);
    } catch (err) {
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.message?.includes("connect")) {
        const connErr = new Error(err.message);
        connErr.isConnectionError = true;
        throw connErr;
      }
      throw err;
    }
  };
  const safe = (dbFn, memFn) => async (...args) => {
    try {
      return await dbFn(...args);
    } catch (err) {
      if (err.isConnectionError) {
        return await memFn(...args);
      }
      throw err;
    }
  };
  const pgRepo = {
    findUserByEmail: async (email) => {
      const r = await q("select * from public.users where email = $1 limit 1", [email]);
      return r.rows[0] ?? null;
    },
    findUserById: async (id) => {
      const r = await q("select * from public.users where id = $1 limit 1", [id]);
      return r.rows[0] ?? null;
    },
    findUserByGoogleId: async (googleId) => {
      if (!googleId) return null;
      const r = await q("select * from public.users where google_id = $1 limit 1", [googleId]);
      return r.rows[0] ?? null;
    },
    createUser: async ({ name, email, passwordHash = null, googleId = null, avatarUrl = null, authProvider = "local" }) => {
      const r = await q("insert into public.users (name, email, password_hash, google_id, avatar_url, auth_provider, last_login_at) values ($1, $2, $3, $4, $5, $6, now()) returning *", [name, email, passwordHash, googleId, avatarUrl, authProvider]);
      const user = r.rows[0];
      try {
        await q("insert into public.user_subscriptions (user_id, plan_id) values ($1, $2) on conflict do nothing", [user.id, "free"]);
        await q("insert into public.user_credits (user_id, balance, allocated_monthly) values ($1, 100, 100) on conflict do nothing", [user.id]);
        await q("insert into public.credit_transactions (user_id, model_id, provider, type, credits, balance_after, details) values ($1, $2, $3, $4, $5, $6, $7)", [user.id, "system", "system", "monthly_grant", 100, 100, JSON.stringify({ note: "Initial free plan registration grant" })]);
      } catch {
      }
      return user;
    },
    createGoogleUser: async ({ googleId, name, email, avatarUrl }) => {
      return pgRepo.createUser({ name, email, passwordHash: null, googleId, avatarUrl, authProvider: "google" });
    },
    linkGoogleAccount: async (userId, { googleId, avatarUrl }) => {
      const r = await q(`update public.users set google_id = $1, avatar_url = coalesce(avatar_url, $2), auth_provider = case when password_hash is not null then 'both' else 'google' end, updated_at = now(), last_login_at = now() where id = $3 returning *`, [googleId, avatarUrl || null, userId]);
      return r.rows[0] ?? null;
    },
    updateUserLastLogin: async (userId) => {
      const r = await q("update public.users set last_login_at = now(), updated_at = now() where id = $1 returning *", [userId]);
      return r.rows[0] ?? null;
    },
    updateUserAvatar: async (userId, avatarUrl) => {
      const r = await q("update public.users set avatar_url = $1, updated_at = now() where id = $2 returning *", [avatarUrl, userId]);
      return r.rows[0] ?? null;
    },
    updateUserName: async (userId, name) => {
      const r = await q("update public.users set name = $1, updated_at = now() where id = $2 returning *", [name, userId]);
      return r.rows[0] ?? null;
    },
    updateUserPassword: async (userId, passwordHash) => {
      const r = await q(`update public.users set password_hash = $1, auth_provider = case when google_id is not null then 'both' else 'local' end, updated_at = now() where id = $2 returning *`, [passwordHash, userId]);
      return r.rows[0] ?? null;
    },
    resetPasswordByEmail: async (email, passwordHash) => {
      const r = await q(`update public.users set password_hash = $1, updated_at = now() where email = $2 returning *`, [passwordHash, (email || "").trim().toLowerCase()]);
      return r.rows[0] ?? memRepo.resetPasswordByEmail(email, passwordHash);
    },
    createSession: async ({ userId, tokenHash, expiresAt }) => {
      await q("insert into public.auth_sessions (user_id, token_hash, expires_at) values ($1, $2, $3)", [userId, tokenHash, expiresAt]);
    },
    findSession: async (tokenHash) => {
      const r = await q("select s.*, u.name, u.email, u.avatar_url, u.auth_provider, u.google_id, u.last_login_at, u.created_at as user_created_at, u.updated_at as user_updated_at from public.auth_sessions s join public.users u on u.id = s.user_id where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()", [tokenHash]);
      return r.rows[0] ?? null;
    },
    findSessionByTokenHash: async (tokenHash) => {
      return pgRepo.findSession(tokenHash);
    },
    touchSession: async (id) => {
      await q("update public.auth_sessions set last_seen_at = now() where id = $1", [id]);
    },
    revokeSession: async (tokenHash) => {
      await q("update public.auth_sessions set revoked_at = now() where token_hash = $1 and revoked_at is null", [tokenHash]);
    },
    listConversations: async (userId) => {
      const r = await q("select id, user_id, title, created_at, updated_at from public.conversations where user_id = $1 order by updated_at desc", [userId]);
      return r.rows;
    },
    createConversation: async (userId, title) => {
      const r = await q("insert into public.conversations (user_id, title) values ($1, $2) returning id, user_id, title, created_at, updated_at", [userId, title]);
      return r.rows[0];
    },
    getConversation: async (userId, id) => {
      const r = await q("select id, user_id, title, created_at, updated_at from public.conversations where id = $1 and user_id = $2", [id, userId]);
      return r.rows[0] ?? null;
    },
    deleteConversation: async (userId, id) => {
      const r = await q("delete from public.conversations where id = $1 and user_id = $2 returning id", [id, userId]);
      return Boolean(r.rowCount);
    },
    listMessages: async (userId, conversationId) => {
      const r = await q("select m.id, m.conversation_id, m.role, m.content, m.created_at from public.messages m join public.conversations c on c.id = m.conversation_id and c.user_id = $1 where m.conversation_id = $2 order by m.sequence_no asc", [userId, conversationId]);
      return r.rows;
    },
    listRecentMessages: async (userId, conversationId, limit2 = 20) => {
      const r = await q("select m.id, m.conversation_id, m.role, m.content, m.created_at from public.messages m join public.conversations c on c.id = m.conversation_id and c.user_id = $1 where m.conversation_id = $2 order by m.sequence_no desc limit $3", [userId, conversationId, limit2]);
      return r.rows.reverse();
    },
    createMessage: async (userId, conversationId, role, content) => {
      const r = await q("insert into public.messages (conversation_id, user_id, role, content) values ($1, $2, $3, $4) returning id, conversation_id, role, content, created_at", [conversationId, userId, role, content]);
      await q("update public.conversations set updated_at = now() where id = $1 and user_id = $2", [conversationId, userId]);
      return r.rows[0];
    },
    getPreferences: async (userId) => {
      const r = await q("select id, user_id, voice_profile_id, speaking_speed, voice_style, language, created_at, updated_at from public.user_preferences where user_id = $1", [userId]);
      return r.rows[0] ?? null;
    },
    upsertPreferences: async (userId, data) => {
      const r = await q(`insert into public.user_preferences (user_id, voice_profile_id, speaking_speed, voice_style, language) values ($1, $2, $3, $4::jsonb, $5) on conflict (user_id) do update set voice_profile_id = excluded.voice_profile_id, speaking_speed = excluded.speaking_speed, voice_style = excluded.voice_style, language = excluded.language returning id, user_id, voice_profile_id, speaking_speed, voice_style, language, created_at, updated_at`, [userId, data.voice_profile_id ?? null, data.speaking_speed, JSON.stringify(data.voice_style ?? {}), data.language]);
      return r.rows[0];
    },
    listVoiceProfiles: async (userId) => {
      const r = await q("select id, user_id, provider, provider_voice_id, name, status, created_at, updated_at from public.voice_profiles where user_id = $1 and status in ($2, $3) order by created_at desc", [userId, "active", "pending"]);
      return r.rows;
    },
    createVoiceProfile: async (userId, provider, providerVoiceId, name, status = "active") => {
      const r = await q("insert into public.voice_profiles (user_id, provider, provider_voice_id, name, status) values ($1, $2, $3, $4, $5) returning id, user_id, provider, provider_voice_id, name, status, created_at, updated_at", [userId, provider, providerVoiceId, name, status]);
      return r.rows[0];
    },
    getVoiceProfile: async (userId, id) => {
      const r = await q("select id, user_id, provider, provider_voice_id, name, status, created_at, updated_at from public.voice_profiles where id = $1 and user_id = $2", [id, userId]);
      return r.rows[0] ?? null;
    },
    deleteVoiceProfile: async (userId, id) => {
      const r = await q("update public.voice_profiles set status = $1, updated_at = now() where id = $2 and user_id = $3 returning id", ["deleted", id, userId]);
      return Boolean(r.rowCount);
    },
    createMemory: async ({ userId, text, embedding, kind = "fact", confidence = 1, sensitivity = "normal", sourceMessageId = null, expiresAt = null }) => {
      const r = await q(
        `insert into public.memory_items (user_id, text, embedding, kind, confidence, sensitivity, source_message_id, expires_at)
         values ($1, $2, $3::vector, $4, $5, $6, $7, $8)
         returning id, text, kind, created_at`,
        [userId, text, JSON.stringify(embedding), kind, confidence, sensitivity, sourceMessageId, expiresAt]
      );
      return r.rows[0];
    },
    updateMemory: async (userId, memoryId, text, embedding) => {
      let r;
      if (embedding) {
        r = await q(`update public.memory_items set text = $1, embedding = $2::vector where id = $3 and user_id = $4 and deleted_at is null returning id, text, kind, updated_at`, [text, JSON.stringify(embedding), memoryId, userId]);
      } else {
        r = await q(`update public.memory_items set text = $1 where id = $2 and user_id = $3 and deleted_at is null returning id, text, kind, updated_at`, [text, memoryId, userId]);
      }
      return r.rows[0] ?? null;
    },
    deleteMemory: async (userId, memoryId) => {
      const r = await q(`update public.memory_items set deleted_at = now() where id = $1 and user_id = $2 and deleted_at is null returning id`, [memoryId, userId]);
      return Boolean(r.rowCount);
    },
    searchMemories: async (userId, embedding, limit2 = 5, matchThreshold = 0.5) => {
      const r = await q(
        `select id, text, kind, confidence, sensitivity, created_at, 1 - (embedding <=> $1::vector) as similarity
         from public.memory_items
         where user_id = $2 and deleted_at is null and 1 - (embedding <=> $1::vector) >= $3
         order by embedding <=> $1::vector asc
         limit $4`,
        [JSON.stringify(embedding), userId, matchThreshold, limit2]
      );
      return r.rows;
    },
    getMemory: async (userId, memoryId) => {
      const r = await q(`select id, text, kind, confidence, sensitivity, created_at from public.memory_items where id = $1 and user_id = $2 and deleted_at is null`, [memoryId, userId]);
      return r.rows[0] ?? null;
    },
    // Multi-Model Postgres
    listAIModels: async () => {
      const r = await q("select * from public.ai_models order by sort_order asc");
      return r.rows.length ? r.rows : memRepo.listAIModels();
    },
    getAIModel: async (id) => {
      const r = await q("select * from public.ai_models where id = $1", [id]);
      return r.rows[0] ?? memRepo.getAIModel(id);
    },
    upsertAIModel: async (data) => {
      const r = await q(
        `insert into public.ai_models (id, provider_id, display_name, description, badge, speed, reasoning, context_window, tier_required, credit_cost_per_request, status, is_enabled, is_default, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         on conflict (id) do update set
           display_name = excluded.display_name,
           description = excluded.description,
           badge = excluded.badge,
           speed = excluded.speed,
           reasoning = excluded.reasoning,
           context_window = excluded.context_window,
           tier_required = excluded.tier_required,
           credit_cost_per_request = excluded.credit_cost_per_request,
           status = excluded.status,
           is_enabled = excluded.is_enabled,
           is_default = excluded.is_default,
           sort_order = excluded.sort_order,
           updated_at = now()
         returning *`,
        [data.id, data.provider_id, data.display_name, data.description, data.badge, data.speed, data.reasoning, data.context_window, data.tier_required, data.credit_cost_per_request, data.status, data.is_enabled, data.is_default, data.sort_order]
      );
      return r.rows[0];
    },
    updateAIModelStatus: async (id, status) => {
      const r = await q("update public.ai_models set status = $1, updated_at = now() where id = $2 returning *", [status, id]);
      return r.rows[0] ?? null;
    },
    listSubscriptionPlans: async () => {
      const r = await q("select * from public.subscription_plans order by monthly_credits asc");
      return r.rows.length ? r.rows : memRepo.listSubscriptionPlans();
    },
    getSubscriptionPlan: async (id) => {
      const r = await q("select * from public.subscription_plans where id = $1", [id]);
      return r.rows[0] ?? memRepo.getSubscriptionPlan(id);
    },
    getUserSubscription: async (userId) => {
      const r = await q(
        `select s.*, p.name as plan_name, p.monthly_credits, p.daily_credit_limit, p.rate_limit_rpm, p.can_use_comparison, p.allowed_tiers
         from public.user_subscriptions s
         join public.subscription_plans p on p.id = s.plan_id
         where s.user_id = $1 limit 1`,
        [userId]
      );
      return r.rows[0] ?? memRepo.getUserSubscription(userId);
    },
    setUserSubscription: async (userId, planId) => {
      await q(`insert into public.user_subscriptions (user_id, plan_id) values ($1, $2) on conflict (user_id) do update set plan_id = excluded.plan_id, updated_at = now()`, [userId, planId]);
      return pgRepo.getUserSubscription(userId);
    },
    getUserCredits: async (userId) => {
      const r = await q("select * from public.user_credits where user_id = $1 limit 1", [userId]);
      return r.rows[0] ?? memRepo.getUserCredits(userId);
    },
    reserveCredits: async (userId, amount) => {
      return memRepo.reserveCredits(userId, amount);
    },
    settleCredits: async (params) => {
      return memRepo.settleCredits(params);
    },
    refundCredits: async (params) => {
      return memRepo.refundCredits(params);
    },
    listCreditTransactions: async (userId, limit2 = 50) => {
      return memRepo.listCreditTransactions(userId, limit2);
    },
    getUserUsageStats: async (userId) => {
      return memRepo.getUserUsageStats(userId);
    },
    getAdminStats: async () => {
      return memRepo.getAdminStats();
    },
    listProjects: async (userId) => {
      return memRepo.listProjects(userId);
    },
    createProject: async (userId, data) => {
      return memRepo.createProject(userId, data);
    },
    getProject: async (userId, id) => {
      return memRepo.getProject(userId, id);
    },
    deleteProject: async (userId, id) => {
      return memRepo.deleteProject(userId, id);
    },
    listFiles: async (userId, filters) => {
      return memRepo.listFiles(userId, filters);
    },
    createFile: async (userId, data) => {
      return memRepo.createFile(userId, data);
    },
    getFile: async (userId, id) => {
      return memRepo.getFile(userId, id);
    },
    deleteFile: async (userId, id) => {
      return memRepo.deleteFile(userId, id);
    },
    upgradeUserSubscription: async (userId, planId) => {
      return memRepo.upgradeUserSubscription(userId, planId);
    },
    createResearchSession: async (params) => {
      return memRepo.createResearchSession(params);
    },
    completeResearchSession: async (id, params) => {
      return memRepo.completeResearchSession(id, params);
    },
    getResearchSession: async (id) => {
      return memRepo.getResearchSession(id);
    },
    createSearchResults: async (sessionId, sources) => {
      return memRepo.createSearchResults(sessionId, sources);
    },
    getSearchResults: async (sessionId) => {
      return memRepo.getSearchResults(sessionId);
    },
    recordModelUsage: async (params) => {
      return memRepo.recordModelUsage(params);
    },
    getModelUsage: async (requestId) => {
      return memRepo.getModelUsage(requestId);
    }
  };
  const result = {};
  for (const key of Object.keys(pgRepo)) {
    result[key] = safe(pgRepo[key], memRepo[key]);
  }
  return result;
}

// src/security.mjs
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(scryptCallback);
async function hashPassword(password, { cost } = {}) {
  const isTest = process.env.NODE_ENV === "test" || process.argv.some((a) => a.includes("test"));
  const N = cost ?? (isTest ? 1024 : 16384);
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  return `$scrypt$${N}$8$1$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}
async function verifyPassword(password, encoded) {
  try {
    const [, scheme, n, r, p, saltText, digestText] = encoded.split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(digestText, "base64url");
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * 1024 * 1024 }));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
function createSessionToken() {
  return randomBytes(32).toString("base64url");
}
function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url || null,
    auth_provider: row.auth_provider || "local",
    has_google: Boolean(row.google_id),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at || null
  };
}
function generateOAuthState() {
  return randomBytes(24).toString("base64url");
}

// src/config.mjs
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch (e) {
}
function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: Number(env.API_PORT ?? 3e3),
    databaseUrl: env.DATABASE_URL || env.POSTGRES_URL || env.SUPABASE_DB_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING || env.SUPABASE_POSTGRES_URL,
    databaseSsl: env.DATABASE_SSL !== "false",
    appOrigin: env.APP_ORIGIN ?? "http://localhost:3000",
    cookieSecure: env.COOKIE_SECURE === "true",
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS ?? 2592e3),
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL ?? "gpt-4o-mini",
    openaiBaseUrl: env.OPENAI_BASE_URL,
    openaiTimeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 15e3),
    openaiMaxRetries: Number(env.OPENAI_MAX_RETRIES ?? 1),
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL ?? "gemini-2.0-flash",
    geminiTimeoutMs: Number(env.GEMINI_TIMEOUT_MS ?? 15e3),
    groqApiKey: env.GROQ_API_KEY,
    groqModel: env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    elevenlabsApiKey: env.ELEVENLABS_API_KEY,
    elevenlabsVoiceId: env.ELEVENLABS_VOICE_ID,
    ttsProvider: env.TTS_PROVIDER ?? (env.ELEVENLABS_API_KEY ? "elevenlabs" : "openai"),
    voiceProvider: env.VOICE_PROVIDER,
    aiProvider: env.AI_PROVIDER ?? (env.OPENAI_API_KEY ? "openai" : "free"),
    googleClientId: env.GOOGLE_CLIENT_ID || "604379040176-dca2rmd9akrtds0rhf62e3ojleer4udl.apps.googleusercontent.com",
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: env.GOOGLE_CALLBACK_URL || null
  };
}

// node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;
var esm_default = import_lib.default;

// src/db.mjs
var { Pool: Pool2 } = esm_default;
function createPool(config = loadConfig()) {
  if (!config.databaseUrl) return null;
  if (process.env.VERCEL && (config.databaseUrl.includes("localhost") || config.databaseUrl.includes("127.0.0.1"))) {
    return null;
  }
  return new Pool2({ connectionString: config.databaseUrl, max: 10, ssl: config.databaseSsl ? { rejectUnauthorized: false } : false });
}

// api/auth/me.js
function getRepos() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function handler(req, res) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;
  if (!rawToken) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "Authentication is required" } }));
  }
  const tokenHash = hashSessionToken(rawToken);
  const repository = getRepos();
  const session = await repository.findSessionByTokenHash(tokenHash);
  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "SESSION_INVALID", message: "Session is invalid or expired" } }));
  }
  const user = await repository.findUserById(session.user_id);
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "USER_NOT_FOUND", message: "User not found" } }));
  }
  const subscription = await repository.getUserSubscription(user.id);
  const credits = await repository.getUserCredits(user.id);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    user: publicUser(user),
    subscription: {
      plan_id: subscription?.plan_id || "free",
      credits_balance: credits?.balance ?? 100
    }
  }));
}

// api/auth/login.js
function getRepos2() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function parseBody(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str2 = Buffer.concat(chunks).toString();
  return str2 ? JSON.parse(str2) : {};
}
async function handler2(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } }));
  }
  try {
    const body = await parseBody(req);
    const { email, password } = body;
    if (!email || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "INVALID_INPUT", message: "Email and password are required" } }));
    }
    const repository = getRepos2();
    const user = await repository.findUserByEmail(email.trim().toLowerCase());
    if (!user || !user.password_hash) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } }));
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } }));
    }
    await repository.updateUserLastLogin(user.id);
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 864e5) });
    const host = req.headers["x-forwarded-host"] || req.headers.host || "varisai.vercel.app";
    const isSecure = !host.includes("localhost");
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`
    });
    res.end(JSON.stringify({ success: true, user: publicUser(user) }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "SERVER_ERROR", message: err.message } }));
  }
}

// api/auth/register.js
function getRepos3() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function parseBody2(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str2 = Buffer.concat(chunks).toString();
  return str2 ? JSON.parse(str2) : {};
}
async function handler3(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } }));
  }
  try {
    const body = await parseBody2(req);
    const { name, email, password } = body;
    if (!name || !email || !password || password.length < 6) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Name, valid email, and min 6 char password required" } }));
    }
    const repository = getRepos3();
    const existing = await repository.findUserByEmail(email.trim().toLowerCase());
    if (existing) {
      res.writeHead(409, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } }));
    }
    const passwordHash = await hashPassword(password);
    const user = await repository.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      authProvider: "local"
    });
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 864e5) });
    const host = req.headers["x-forwarded-host"] || req.headers.host || "varisai.vercel.app";
    const isSecure = !host.includes("localhost");
    res.writeHead(201, {
      "Content-Type": "application/json",
      "Set-Cookie": `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`
    });
    res.end(JSON.stringify({ success: true, user: publicUser(user) }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "SERVER_ERROR", message: err.message } }));
  }
}

// api/auth/logout.js
function getRepos4() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function handler4(req, res) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const repository = getRepos4();
    await repository.revokeSession(tokenHash);
  }
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie": "varis_session=; Max-Age=0; Path=/"
  });
  res.end(JSON.stringify({ status: "success" }));
}

// src/google-auth.mjs
function isGoogleAuthConfigured(config) {
  return Boolean(config?.googleClientId && config?.googleClientSecret);
}
function buildGoogleAuthUrl(config, state, redirectUri = null) {
  if (!isGoogleAuthConfigured(config)) {
    throw new Error("Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.");
  }
  const callbackUrl = redirectUri || config.googleCallbackUrl;
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
async function exchangeGoogleCode(config, code, redirectUri = null) {
  const callbackUrl = redirectUri || config.googleCallbackUrl;
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code"
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || errData.error || `Google token exchange failed with status ${res.status}`);
  }
  return res.json();
}
async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || `Google UserInfo fetch failed with status ${res.status}`);
  }
  return res.json();
}
async function verifyGoogleIdToken(config, credential) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_description || errData.error || "Invalid Google ID token");
  }
  const payload = await res.json();
  if (config.googleClientId && payload.aud !== config.googleClientId) {
    const audErr = new Error("Google token audience does not match configured Client ID");
    audErr.code = "INVALID_TOKEN_AUDIENCE";
    throw audErr;
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || payload.email?.split("@")[0] || "Google User",
    picture: payload.picture || null
  };
}
async function processGoogleAuth({
  config,
  repository,
  code,
  state,
  expectedState,
  redirectUri = null,
  mockUserInfo = null
}) {
  if (!state || !expectedState || state !== expectedState) {
    const stateErr = new Error("Invalid OAuth state. CSRF protection verification failed.");
    stateErr.code = "INVALID_OAUTH_STATE";
    throw stateErr;
  }
  let userInfo = mockUserInfo;
  if (!userInfo) {
    const tokens = await exchangeGoogleCode(config, code, redirectUri);
    userInfo = await fetchGoogleUserInfo(tokens.access_token);
  }
  const googleId = userInfo.sub || userInfo.id;
  const email = (userInfo.email || "").trim().toLowerCase();
  const name = userInfo.name || email.split("@")[0] || "Google User";
  const avatarUrl = userInfo.picture || userInfo.avatar_url || null;
  if (!googleId || !email) {
    const dataErr = new Error("Incomplete user profile received from Google.");
    dataErr.code = "INVALID_GOOGLE_PROFILE";
    throw dataErr;
  }
  let user = await repository.findUserByGoogleId(googleId);
  if (user) {
    await repository.updateUserLastLogin(user.id);
    if (!user.avatar_url && avatarUrl) {
      await repository.updateUserAvatar(user.id, avatarUrl);
      user.avatar_url = avatarUrl;
    }
    return { user, isNew: false, linked: false };
  }
  user = await repository.findUserByEmail(email);
  if (user) {
    user = await repository.linkGoogleAccount(user.id, { googleId, avatarUrl });
    return { user, isNew: false, linked: true };
  }
  user = await repository.createGoogleUser({
    googleId,
    name,
    email,
    avatarUrl
  });
  return { user, isNew: true, linked: false };
}
async function processGoogleCredential({
  config,
  repository,
  credential,
  mockUserInfo = null
}) {
  let userInfo = mockUserInfo;
  if (!userInfo) {
    userInfo = await verifyGoogleIdToken(config, credential);
  }
  const googleId = userInfo.sub || userInfo.id;
  const email = (userInfo.email || "").trim().toLowerCase();
  const name = userInfo.name || email.split("@")[0] || "Google User";
  const avatarUrl = userInfo.picture || userInfo.avatar_url || null;
  if (!googleId || !email) {
    const dataErr = new Error("Incomplete user profile received from Google.");
    dataErr.code = "INVALID_GOOGLE_PROFILE";
    throw dataErr;
  }
  let user = await repository.findUserByGoogleId(googleId);
  if (user) {
    await repository.updateUserLastLogin(user.id);
    if (!user.avatar_url && avatarUrl) {
      await repository.updateUserAvatar(user.id, avatarUrl);
      user.avatar_url = avatarUrl;
    }
    return { user, isNew: false, linked: false };
  }
  user = await repository.findUserByEmail(email);
  if (user) {
    user = await repository.linkGoogleAccount(user.id, { googleId, avatarUrl });
    return { user, isNew: false, linked: true };
  }
  user = await repository.createGoogleUser({
    googleId,
    name,
    email,
    avatarUrl
  });
  return { user, isNew: true, linked: false };
}

// api/auth/google.js
function handler5(req, res) {
  const config = loadConfig();
  if (!config.googleClientId || !config.googleClientSecret) {
    res.writeHead(302, { Location: "/?error=oauth_unavailable" });
    return res.end();
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host || "varisai.vercel.app";
  const proto = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
  const redirectUri = config.googleCallbackUrl || `${proto}://${host}/api/auth/google/callback`;
  const state = generateOAuthState();
  const isSecure = proto === "https";
  res.writeHead(302, {
    Location: buildGoogleAuthUrl(config, state, redirectUri),
    "Set-Cookie": `varis_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`
  });
  res.end();
}

// api/auth/google/callback.js
function getRepos5() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function handler6(req, res) {
  const url = new URL(req.url, `https://${req.headers["x-forwarded-host"] || req.headers.host || "varisai.vercel.app"}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    res.writeHead(302, {
      Location: `/?error=${oauthError === "access_denied" ? "cancelled" : "auth_failed"}`,
      "Set-Cookie": "varis_oauth_state=; Max-Age=0; Path=/"
    });
    return res.end();
  }
  const cookieHeader = req.headers.cookie || "";
  const expectedStateMatch = cookieHeader.match(/varis_oauth_state=([^;]+)/);
  const expectedState = expectedStateMatch ? expectedStateMatch[1] : null;
  const config = loadConfig();
  const host = req.headers["x-forwarded-host"] || req.headers.host || "varisai.vercel.app";
  const proto = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
  const redirectUri = config.googleCallbackUrl || `${proto}://${host}/api/auth/google/callback`;
  try {
    const repository = getRepos5();
    const { user, isNew, linked } = await processGoogleAuth({
      config,
      repository,
      code,
      state,
      expectedState,
      redirectUri
    });
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 864e5) });
    const isSecure = proto === "https";
    const params = new URLSearchParams({ auth: "success" });
    if (linked) params.set("linked", "true");
    if (isNew) params.set("is_new", "true");
    res.writeHead(302, {
      Location: `/?${params.toString()}`,
      "Set-Cookie": [
        `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`,
        "varis_oauth_state=; Max-Age=0; Path=/"
      ]
    });
    res.end();
  } catch (err) {
    console.error("Google callback error:", err);
    res.writeHead(302, {
      Location: "/?error=auth_failed",
      "Set-Cookie": "varis_oauth_state=; Max-Age=0; Path=/"
    });
    res.end();
  }
}

// api/auth/google/credential.js
function getRepos6() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function parseBody3(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str2 = Buffer.concat(chunks).toString();
  return str2 ? JSON.parse(str2) : {};
}
async function handler7(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }
  try {
    const body = await parseBody3(req);
    const { credential } = body;
    if (!credential) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Google credential token is required" }));
    }
    const config = loadConfig();
    const repository = getRepos6();
    const { user, isNew, linked } = await processGoogleCredential({
      config,
      repository,
      credential
    });
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    await repository.createSession({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 864e5)
    });
    const host = req.headers["x-forwarded-host"] || req.headers.host || "varisai.vercel.app";
    const proto = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
    const isSecure = proto === "https";
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": `varis_session=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`
    });
    res.end(JSON.stringify({
      success: true,
      user: publicUser(user),
      is_new: isNew,
      linked
    }));
  } catch (err) {
    console.error("Google GIS credential error:", err);
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: err.message || "Google authentication verification failed" }));
  }
}

// api/models.js
function handler8(req, res) {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const enrichedModels = DEFAULT_AI_MODELS.map((m) => {
    let status = m.status || "available";
    if (m.provider_id === "google") {
      status = hasGemini ? "available" : "not_configured";
    } else if (m.provider_id === "openai") {
      status = hasOpenAI ? "available" : "not_configured";
    } else if (m.provider_id === "groq") {
      status = hasGroq ? "available" : "not_configured";
    } else if (m.id === "auto") {
      status = "available";
    }
    return {
      ...m,
      status,
      is_available: status === "available"
    };
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    models: enrichedModels,
    data: enrichedModels,
    count: enrichedModels.length,
    providers: {
      openai: hasOpenAI ? "configured" : "missing_key",
      gemini: hasGemini ? "configured" : "missing_key",
      groq: hasGroq ? "configured" : "missing_key"
    }
  }));
}

// api/ai/chat.js
import { randomUUID as randomUUID2 } from "node:crypto";

// node_modules/openai/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// node_modules/openai/internal/utils/uuid.mjs
var uuid4 = function() {
  const { crypto: crypto2 } = globalThis;
  if (crypto2?.randomUUID) {
    uuid4 = crypto2.randomUUID.bind(crypto2);
    return crypto2.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto2 ? () => crypto2.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};

// node_modules/openai/internal/errors.mjs
function isAbortError(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
};

// node_modules/openai/core/error.mjs
var OpenAIError = class extends Error {
};
var APIError = class _APIError extends OpenAIError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("x-request-id");
    this.error = error;
    const data = error;
    this.code = data?.["code"];
    this.param = data?.["param"];
    this.type = data?.["type"];
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse?.["error"];
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};
var LengthFinishReasonError = class extends OpenAIError {
  constructor() {
    super(`Could not parse response content as the length limit was reached`);
  }
};
var ContentFilterFinishReasonError = class extends OpenAIError {
  constructor() {
    super(`Could not parse response content as the request was rejected by the content filter`);
  }
};
var InvalidWebhookSignatureError = class extends Error {
  constructor(message) {
    super(message);
  }
};

// node_modules/openai/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArray = (val) => (isArray = Array.isArray, isArray(val));
var isReadonlyArray = isArray;
function maybeObj(x) {
  if (typeof x !== "object") {
    return {};
  }
  return x ?? {};
}
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new OpenAIError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new OpenAIError(`${name} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
};

// node_modules/openai/internal/utils/sleep.mjs
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// node_modules/openai/version.mjs
var VERSION = "5.23.2";

// node_modules/openai/internal/detect-platform.mjs
var isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== "undefined" && // @ts-ignore
    typeof window.document !== "undefined" && // @ts-ignore
    typeof navigator !== "undefined"
  );
};
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};

// node_modules/openai/internal/shims.mjs
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}

// node_modules/openai/internal/request-options.mjs
var FallbackEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
};

// node_modules/openai/internal/qs/formats.mjs
var default_format = "RFC3986";
var default_formatter = (v) => String(v);
var formatters = {
  RFC1738: (v) => String(v).replace(/%20/g, "+"),
  RFC3986: default_formatter
};
var RFC1738 = "RFC1738";

// node_modules/openai/internal/qs/utils.mjs
var has = (obj, key) => (has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has(obj, key));
var hex_table = /* @__PURE__ */ (() => {
  const array = [];
  for (let i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
})();
var limit = 1024;
var encode = (str2, _defaultEncoder, charset, _kind, format) => {
  if (str2.length === 0) {
    return str2;
  }
  let string = str2;
  if (typeof str2 === "symbol") {
    string = Symbol.prototype.toString.call(str2);
  } else if (typeof str2 !== "string") {
    string = String(str2);
  }
  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }
  let out = "";
  for (let j = 0; j < string.length; j += limit) {
    const segment = string.length >= limit ? string.slice(j, j + limit) : string;
    const arr = [];
    for (let i = 0; i < segment.length; ++i) {
      let c = segment.charCodeAt(i);
      if (c === 45 || // -
      c === 46 || // .
      c === 95 || // _
      c === 126 || // ~
      c >= 48 && c <= 57 || // 0-9
      c >= 65 && c <= 90 || // a-z
      c >= 97 && c <= 122 || // A-Z
      format === RFC1738 && (c === 40 || c === 41)) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hex_table[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
        continue;
      }
      i += 1;
      c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
      arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
    }
    out += arr.join("");
  }
  return out;
};
function is_buffer(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function maybe_map(val, fn) {
  if (isArray(val)) {
    const mapped = [];
    for (let i = 0; i < val.length; i += 1) {
      mapped.push(fn(val[i]));
    }
    return mapped;
  }
  return fn(val);
}

// node_modules/openai/internal/qs/stringify.mjs
var array_prefix_generators = {
  brackets(prefix) {
    return String(prefix) + "[]";
  },
  comma: "comma",
  indices(prefix, key) {
    return String(prefix) + "[" + key + "]";
  },
  repeat(prefix) {
    return String(prefix);
  }
};
var push_to_array = function(arr, value_or_array) {
  Array.prototype.push.apply(arr, isArray(value_or_array) ? value_or_array : [value_or_array]);
};
var toISOString;
var defaults2 = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: encode,
  encodeValuesOnly: false,
  format: default_format,
  formatter: default_formatter,
  /** @deprecated */
  indices: false,
  serializeDate(date) {
    return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
  },
  skipNulls: false,
  strictNullHandling: false
};
function is_non_nullish_primitive(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
var sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
  let obj = object;
  let tmp_sc = sideChannel;
  let step = 0;
  let find_flag = false;
  while ((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag) {
    const pos = tmp_sc.get(object);
    step += 1;
    if (typeof pos !== "undefined") {
      if (pos === step) {
        throw new RangeError("Cyclic object value");
      } else {
        find_flag = true;
      }
    }
    if (typeof tmp_sc.get(sentinel) === "undefined") {
      step = 0;
    }
  }
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate?.(obj);
  } else if (generateArrayPrefix === "comma" && isArray(obj)) {
    obj = maybe_map(obj, function(value) {
      if (value instanceof Date) {
        return serializeDate?.(value);
      }
      return value;
    });
  }
  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? (
        // @ts-expect-error
        encoder(prefix, defaults2.encoder, charset, "key", format)
      ) : prefix;
    }
    obj = "";
  }
  if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
    if (encoder) {
      const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults2.encoder, charset, "key", format);
      return [
        formatter?.(key_value) + "=" + // @ts-expect-error
        formatter?.(encoder(obj, defaults2.encoder, charset, "value", format))
      ];
    }
    return [formatter?.(prefix) + "=" + formatter?.(String(obj))];
  }
  const values = [];
  if (typeof obj === "undefined") {
    return values;
  }
  let obj_keys;
  if (generateArrayPrefix === "comma" && isArray(obj)) {
    if (encodeValuesOnly && encoder) {
      obj = maybe_map(obj, encoder);
    }
    obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
  } else if (isArray(filter)) {
    obj_keys = filter;
  } else {
    const keys = Object.keys(obj);
    obj_keys = sort ? keys.sort(sort) : keys;
  }
  const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
  const adjusted_prefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
  if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
    return adjusted_prefix + "[]";
  }
  for (let j = 0; j < obj_keys.length; ++j) {
    const key = obj_keys[j];
    const value = (
      // @ts-ignore
      typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key]
    );
    if (skipNulls && value === null) {
      continue;
    }
    const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
    const key_prefix = isArray(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
    sideChannel.set(object, step);
    const valueSideChannel = /* @__PURE__ */ new WeakMap();
    valueSideChannel.set(sentinel, sideChannel);
    push_to_array(values, inner_stringify(
      value,
      key_prefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      // @ts-ignore
      generateArrayPrefix === "comma" && encodeValuesOnly && isArray(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ));
  }
  return values;
}
function normalize_stringify_options(opts = defaults2) {
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  const charset = opts.charset || defaults2.charset;
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  let format = default_format;
  if (typeof opts.format !== "undefined") {
    if (!has(formatters, opts.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    format = opts.format;
  }
  const formatter = formatters[format];
  let filter = defaults2.filter;
  if (typeof opts.filter === "function" || isArray(opts.filter)) {
    filter = opts.filter;
  }
  let arrayFormat;
  if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
    arrayFormat = opts.arrayFormat;
  } else if ("indices" in opts) {
    arrayFormat = opts.indices ? "indices" : "repeat";
  } else {
    arrayFormat = defaults2.arrayFormat;
  }
  if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults2.allowDots : !!opts.allowDots;
  return {
    addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults2.addQueryPrefix,
    // @ts-ignore
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults2.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults2.charsetSentinel,
    commaRoundTrip: !!opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === "undefined" ? defaults2.delimiter : opts.delimiter,
    encode: typeof opts.encode === "boolean" ? opts.encode : defaults2.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults2.encodeDotInKeys,
    encoder: typeof opts.encoder === "function" ? opts.encoder : defaults2.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults2.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults2.serializeDate,
    skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults2.skipNulls,
    // @ts-ignore
    sort: typeof opts.sort === "function" ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults2.strictNullHandling
  };
}
function stringify(object, opts = {}) {
  let obj = object;
  const options = normalize_stringify_options(opts);
  let obj_keys;
  let filter;
  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (isArray(options.filter)) {
    filter = options.filter;
    obj_keys = filter;
  }
  const keys = [];
  if (typeof obj !== "object" || obj === null) {
    return "";
  }
  const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
  const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
  if (!obj_keys) {
    obj_keys = Object.keys(obj);
  }
  if (options.sort) {
    obj_keys.sort(options.sort);
  }
  const sideChannel = /* @__PURE__ */ new WeakMap();
  for (let i = 0; i < obj_keys.length; ++i) {
    const key = obj_keys[i];
    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    push_to_array(keys, inner_stringify(
      obj[key],
      key,
      // @ts-expect-error
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel
    ));
  }
  const joined = keys.join(options.delimiter);
  let prefix = options.addQueryPrefix === true ? "?" : "";
  if (options.charsetSentinel) {
    if (options.charset === "iso-8859-1") {
      prefix += "utf8=%26%2310003%3B&";
    } else {
      prefix += "utf8=%E2%9C%93&";
    }
  }
  return joined.length > 0 ? prefix + joined : "";
}

// node_modules/openai/internal/utils/bytes.mjs
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str2) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str2);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}

// node_modules/openai/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  constructor() {
    _LineDecoder_buffer.set(this, void 0);
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

// node_modules/openai/internal/utils/log.mjs
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
};
function noop() {
}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
  const logger = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};

// node_modules/openai/core/streaming.mjs
var _Stream_client;
var Stream = class _Stream {
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    _Stream_client.set(this, void 0);
    this.controller = controller;
    __classPrivateFieldSet(this, _Stream_client, client, "f");
  }
  static fromSSEResponse(response, controller, client) {
    let consumed = false;
    const logger = client ? loggerFor(client) : console;
    async function* iterator() {
      if (consumed) {
        throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (done)
            continue;
          if (sse.data.startsWith("[DONE]")) {
            done = true;
            continue;
          }
          if (sse.event === null || !sse.event.startsWith("thread.")) {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (data && data.error) {
              throw new APIError(void 0, data.error, void 0, response.headers);
            }
            yield data;
          } else {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (sse.event == "error") {
              throw new APIError(void 0, data.error, data.message, void 0);
            }
            yield { event: sse.event, data };
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  [(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
      new _Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new OpenAIError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str2, delimiter) {
  const index = str2.indexOf(delimiter);
  if (index !== -1) {
    return [str2.substring(0, index), delimiter, str2.substring(index + delimiter.length)];
  }
  return [str2, "", ""];
}

// node_modules/openai/internal/parse.mjs
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller, client);
      }
      return Stream.fromSSEResponse(response, props.controller, client);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const json = await response.json();
      return addRequestID(json, response);
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
function addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("x-request-id"),
    enumerable: false
  });
}

// node_modules/openai/core/api-promise.mjs
var _APIPromise_client;
var APIPromise = class _APIPromise extends Promise {
  constructor(client, responsePromise, parseResponse2 = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse2;
    _APIPromise_client.set(this, void 0);
    __classPrivateFieldSet(this, _APIPromise_client, client, "f");
  }
  _thenUnwrap(transform) {
    return new _APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addRequestID(transform(await this.parseResponse(client, props), props), props.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the X-Request-ID header which is useful for debugging requests and reporting
   * issues to OpenAI.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("x-request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();

// node_modules/openai/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
  constructor(client, response, body, options) {
    _AbstractPage_client.set(this, void 0);
    __classPrivateFieldSet(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new OpenAIError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var PagePromise = class extends APIPromise {
  constructor(client, request, Page2) {
    super(client, request, async (client2, props) => new Page2(client2, props.response, await defaultParseResponse(client2, props), props.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var Page = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.object = body.object;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    return null;
  }
};
var CursorPage = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const data = this.getPaginatedItems();
    const id = data[data.length - 1]?.id;
    if (!id) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after: id
      }
    };
  }
};
var ConversationCursorPage = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.last_id = body.last_id || "";
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after: cursor
      }
    };
  }
};

// node_modules/openai/internal/uploads.mjs
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var multipartFormRequestOptions = async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var supportsFormDataMap = /* @__PURE__ */ new WeakMap();
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData();
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
var createForm = async (body, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var isNamedBlob = (value) => value instanceof Blob && "name" in value;
var addFormValue = async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    form.append(key, makeFile([await value.blob()], getName(value)));
  } else if (isAsyncIterable(value)) {
    form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, value, getName(value));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/openai/internal/to-file.mjs
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  if (isFileLike(value)) {
    if (value instanceof File) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], value.name);
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  name || (name = getName(value));
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts, name, options);
}
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}

// node_modules/openai/core/resource.mjs
var APIResource = class {
  constructor(client) {
    this._client = client;
  }
};

// node_modules/openai/internal/utils/path.mjs
function encodeURIPath(str2) {
  return str2.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path5(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path6 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path6.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new OpenAIError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path6}
${underline}`);
  }
  return path6;
};
var path2 = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/openai/resources/chat/completions/messages.mjs
var Messages = class extends APIResource {
  /**
   * Get the messages in a stored chat completion. Only Chat Completions that have
   * been created with the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
   *   'completion_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(completionID, query = {}, options) {
    return this._client.getAPIList(path2`/chat/completions/${completionID}/messages`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/lib/parser.mjs
function isChatCompletionFunctionTool(tool) {
  return tool !== void 0 && "function" in tool && tool.function !== void 0;
}
function isAutoParsableResponseFormat(response_format) {
  return response_format?.["$brand"] === "auto-parseable-response-format";
}
function isAutoParsableTool(tool) {
  return tool?.["$brand"] === "auto-parseable-tool";
}
function maybeParseChatCompletion(completion, params) {
  if (!params || !hasAutoParseableInput(params)) {
    return {
      ...completion,
      choices: completion.choices.map((choice) => {
        assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
        return {
          ...choice,
          message: {
            ...choice.message,
            parsed: null,
            ...choice.message.tool_calls ? {
              tool_calls: choice.message.tool_calls
            } : void 0
          }
        };
      })
    };
  }
  return parseChatCompletion(completion, params);
}
function parseChatCompletion(completion, params) {
  const choices = completion.choices.map((choice) => {
    if (choice.finish_reason === "length") {
      throw new LengthFinishReasonError();
    }
    if (choice.finish_reason === "content_filter") {
      throw new ContentFilterFinishReasonError();
    }
    assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
    return {
      ...choice,
      message: {
        ...choice.message,
        ...choice.message.tool_calls ? {
          tool_calls: choice.message.tool_calls?.map((toolCall) => parseToolCall(params, toolCall)) ?? void 0
        } : void 0,
        parsed: choice.message.content && !choice.message.refusal ? parseResponseFormat(params, choice.message.content) : null
      }
    };
  });
  return { ...completion, choices };
}
function parseResponseFormat(params, content) {
  if (params.response_format?.type !== "json_schema") {
    return null;
  }
  if (params.response_format?.type === "json_schema") {
    if ("$parseRaw" in params.response_format) {
      const response_format = params.response_format;
      return response_format.$parseRaw(content);
    }
    return JSON.parse(content);
  }
  return null;
}
function parseToolCall(params, toolCall) {
  const inputTool = params.tools?.find((inputTool2) => isChatCompletionFunctionTool(inputTool2) && inputTool2.function?.name === toolCall.function.name);
  return {
    ...toolCall,
    function: {
      ...toolCall.function,
      parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCall.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCall.function.arguments) : null
    }
  };
}
function shouldParseToolCall(params, toolCall) {
  if (!params || !("tools" in params) || !params.tools) {
    return false;
  }
  const inputTool = params.tools?.find((inputTool2) => isChatCompletionFunctionTool(inputTool2) && inputTool2.function?.name === toolCall.function.name);
  return isChatCompletionFunctionTool(inputTool) && (isAutoParsableTool(inputTool) || inputTool?.function.strict || false);
}
function hasAutoParseableInput(params) {
  if (isAutoParsableResponseFormat(params.response_format)) {
    return true;
  }
  return params.tools?.some((t) => isAutoParsableTool(t) || t.type === "function" && t.function.strict === true) ?? false;
}
function assertToolCallsAreChatCompletionFunctionToolCalls(toolCalls) {
  for (const toolCall of toolCalls || []) {
    if (toolCall.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
    }
  }
}
function validateInputTools(tools) {
  for (const tool of tools ?? []) {
    if (tool.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
    }
    if (tool.function.strict !== true) {
      throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
    }
  }
}

// node_modules/openai/lib/chatCompletionUtils.mjs
var isAssistantMessage = (message) => {
  return message?.role === "assistant";
};
var isToolMessage = (message) => {
  return message?.role === "tool";
};

// node_modules/openai/lib/EventStream.mjs
var _EventStream_instances;
var _EventStream_connectedPromise;
var _EventStream_resolveConnectedPromise;
var _EventStream_rejectConnectedPromise;
var _EventStream_endPromise;
var _EventStream_resolveEndPromise;
var _EventStream_rejectEndPromise;
var _EventStream_listeners;
var _EventStream_ended;
var _EventStream_errored;
var _EventStream_aborted;
var _EventStream_catchingPromiseCreated;
var _EventStream_handleError;
var EventStream = class {
  constructor() {
    _EventStream_instances.add(this);
    this.controller = new AbortController();
    _EventStream_connectedPromise.set(this, void 0);
    _EventStream_resolveConnectedPromise.set(this, () => {
    });
    _EventStream_rejectConnectedPromise.set(this, () => {
    });
    _EventStream_endPromise.set(this, void 0);
    _EventStream_resolveEndPromise.set(this, () => {
    });
    _EventStream_rejectEndPromise.set(this, () => {
    });
    _EventStream_listeners.set(this, {});
    _EventStream_ended.set(this, false);
    _EventStream_errored.set(this, false);
    _EventStream_aborted.set(this, false);
    _EventStream_catchingPromiseCreated.set(this, false);
    __classPrivateFieldSet(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _EventStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _EventStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _EventStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _EventStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _EventStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _EventStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _EventStream_endPromise, "f").catch(() => {
    });
  }
  _run(executor) {
    setTimeout(() => {
      executor().then(() => {
        this._emitFinal();
        this._emit("end");
      }, __classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_handleError).bind(this));
    }, 0);
  }
  _connected() {
    if (this.ended)
      return;
    __classPrivateFieldGet(this, _EventStream_resolveConnectedPromise, "f").call(this);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _EventStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _EventStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _EventStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _EventStream_endPromise, "f");
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _EventStream_ended, "f")) {
      return;
    }
    if (event === "end") {
      __classPrivateFieldSet(this, _EventStream_ended, true, "f");
      __classPrivateFieldGet(this, _EventStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
  }
};
_EventStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_endPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_listeners = /* @__PURE__ */ new WeakMap(), _EventStream_ended = /* @__PURE__ */ new WeakMap(), _EventStream_errored = /* @__PURE__ */ new WeakMap(), _EventStream_aborted = /* @__PURE__ */ new WeakMap(), _EventStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _EventStream_instances = /* @__PURE__ */ new WeakSet(), _EventStream_handleError = function _EventStream_handleError2(error) {
  __classPrivateFieldSet(this, _EventStream_errored, true, "f");
  if (error instanceof Error && error.name === "AbortError") {
    error = new APIUserAbortError();
  }
  if (error instanceof APIUserAbortError) {
    __classPrivateFieldSet(this, _EventStream_aborted, true, "f");
    return this._emit("abort", error);
  }
  if (error instanceof OpenAIError) {
    return this._emit("error", error);
  }
  if (error instanceof Error) {
    const openAIError = new OpenAIError(error.message);
    openAIError.cause = error;
    return this._emit("error", openAIError);
  }
  return this._emit("error", new OpenAIError(String(error)));
};

// node_modules/openai/lib/RunnableFunction.mjs
function isRunnableFunctionWithParse(fn) {
  return typeof fn.parse === "function";
}

// node_modules/openai/lib/AbstractChatCompletionRunner.mjs
var _AbstractChatCompletionRunner_instances;
var _AbstractChatCompletionRunner_getFinalContent;
var _AbstractChatCompletionRunner_getFinalMessage;
var _AbstractChatCompletionRunner_getFinalFunctionToolCall;
var _AbstractChatCompletionRunner_getFinalFunctionToolCallResult;
var _AbstractChatCompletionRunner_calculateTotalUsage;
var _AbstractChatCompletionRunner_validateParams;
var _AbstractChatCompletionRunner_stringifyFunctionCallResult;
var DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class extends EventStream {
  constructor() {
    super(...arguments);
    _AbstractChatCompletionRunner_instances.add(this);
    this._chatCompletions = [];
    this.messages = [];
  }
  _addChatCompletion(chatCompletion) {
    this._chatCompletions.push(chatCompletion);
    this._emit("chatCompletion", chatCompletion);
    const message = chatCompletion.choices[0]?.message;
    if (message)
      this._addMessage(message);
    return chatCompletion;
  }
  _addMessage(message, emit = true) {
    if (!("content" in message))
      message.content = null;
    this.messages.push(message);
    if (emit) {
      this._emit("message", message);
      if (isToolMessage(message) && message.content) {
        this._emit("functionToolCallResult", message.content);
      } else if (isAssistantMessage(message) && message.tool_calls) {
        for (const tool_call of message.tool_calls) {
          if (tool_call.type === "function") {
            this._emit("functionToolCall", tool_call.function);
          }
        }
      }
    }
  }
  /**
   * @returns a promise that resolves with the final ChatCompletion, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
   */
  async finalChatCompletion() {
    await this.done();
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (!completion)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return completion;
  }
  /**
   * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalContent() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
   * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the content of the final FunctionCall, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalFunctionToolCall() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
  }
  async finalFunctionToolCallResult() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
  }
  async totalUsage() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
  }
  allChatCompletions() {
    return [...this._chatCompletions];
  }
  _emitFinal() {
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (completion)
      this._emit("finalChatCompletion", completion);
    const finalMessage = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
    if (finalMessage)
      this._emit("finalMessage", finalMessage);
    const finalContent = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
    if (finalContent)
      this._emit("finalContent", finalContent);
    const finalFunctionCall = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
    if (finalFunctionCall)
      this._emit("finalFunctionToolCall", finalFunctionCall);
    const finalFunctionCallResult = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
    if (finalFunctionCallResult != null)
      this._emit("finalFunctionToolCallResult", finalFunctionCallResult);
    if (this._chatCompletions.some((c) => c.usage)) {
      this._emit("totalUsage", __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
    }
  }
  async _createChatCompletion(client, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
    const chatCompletion = await client.chat.completions.create({ ...params, stream: false }, { ...options, signal: this.controller.signal });
    this._connected();
    return this._addChatCompletion(parseChatCompletion(chatCompletion, params));
  }
  async _runChatCompletion(client, params, options) {
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    return await this._createChatCompletion(client, params, options);
  }
  async _runTools(client, params, options) {
    const role = "tool";
    const { tool_choice = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof tool_choice !== "string" && tool_choice.type === "function" && tool_choice?.function?.name;
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const inputTools = params.tools.map((tool) => {
      if (isAutoParsableTool(tool)) {
        if (!tool.$callback) {
          throw new OpenAIError("Tool given to `.runTools()` that does not have an associated function");
        }
        return {
          type: "function",
          function: {
            function: tool.$callback,
            name: tool.function.name,
            description: tool.function.description || "",
            parameters: tool.function.parameters,
            parse: tool.$parseRaw,
            strict: true
          }
        };
      }
      return tool;
    });
    const functionsByName = {};
    for (const f of inputTools) {
      if (f.type === "function") {
        functionsByName[f.function.name || f.function.function.name] = f.function;
      }
    }
    const tools = "tools" in params ? inputTools.map((t) => t.type === "function" ? {
      type: "function",
      function: {
        name: t.function.name || t.function.function.name,
        parameters: t.function.parameters,
        description: t.function.description,
        strict: t.function.strict
      }
    } : t) : void 0;
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(client, {
        ...restParams,
        tool_choice,
        tools,
        messages: [...this.messages]
      }, options);
      const message = chatCompletion.choices[0]?.message;
      if (!message) {
        throw new OpenAIError(`missing message in ChatCompletion response`);
      }
      if (!message.tool_calls?.length) {
        return;
      }
      for (const tool_call of message.tool_calls) {
        if (tool_call.type !== "function")
          continue;
        const tool_call_id = tool_call.id;
        const { name, arguments: args } = tool_call.function;
        const fn = functionsByName[name];
        if (!fn) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName).map((name2) => JSON.stringify(name2)).join(", ")}. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        } else if (singleFunctionToCall && singleFunctionToCall !== name) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        let parsed;
        try {
          parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
        } catch (error) {
          const content2 = error instanceof Error ? error.message : String(error);
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        const rawContent = await fn.function(parsed, this);
        const content = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
        this._addMessage({ role, tool_call_id, content });
        if (singleFunctionToCall) {
          return;
        }
      }
    }
    return;
  }
};
_AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent2() {
  return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage2() {
  let i = this.messages.length;
  while (i-- > 0) {
    const message = this.messages[i];
    if (isAssistantMessage(message)) {
      const ret = {
        ...message,
        content: message.content ?? null,
        refusal: message.refusal ?? null
      };
      return ret;
    }
  }
  throw new OpenAIError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, _AbstractChatCompletionRunner_getFinalFunctionToolCall = function _AbstractChatCompletionRunner_getFinalFunctionToolCall2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isAssistantMessage(message) && message?.tool_calls?.length) {
      return message.tool_calls.filter((x) => x.type === "function").at(-1)?.function;
    }
  }
  return;
}, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult = function _AbstractChatCompletionRunner_getFinalFunctionToolCallResult2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isToolMessage(message) && message.content != null && typeof message.content === "string" && this.messages.some((x) => x.role === "assistant" && x.tool_calls?.some((y) => y.type === "function" && y.id === message.tool_call_id))) {
      return message.content;
    }
  }
  return;
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage2() {
  const total = {
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  };
  for (const { usage } of this._chatCompletions) {
    if (usage) {
      total.completion_tokens += usage.completion_tokens;
      total.prompt_tokens += usage.prompt_tokens;
      total.total_tokens += usage.total_tokens;
    }
  }
  return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams2(params) {
  if (params.n != null && params.n > 1) {
    throw new OpenAIError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
  }
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult2(rawContent) {
  return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
};

// node_modules/openai/lib/ChatCompletionRunner.mjs
var ChatCompletionRunner = class _ChatCompletionRunner extends AbstractChatCompletionRunner {
  static runTools(client, params, options) {
    const runner = new _ChatCompletionRunner();
    const opts = {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
  _addMessage(message, emit = true) {
    super._addMessage(message, emit);
    if (isAssistantMessage(message) && message.content) {
      this._emit("content", message.content);
    }
  }
};

// node_modules/openai/_vendor/partial-json-parser/parser.mjs
var STR = 1;
var NUM = 2;
var ARR = 4;
var OBJ = 8;
var NULL = 16;
var BOOL = 32;
var NAN = 64;
var INFINITY = 128;
var MINUS_INFINITY = 256;
var INF = INFINITY | MINUS_INFINITY;
var SPECIAL = NULL | BOOL | INF | NAN;
var ATOM = STR | NUM | SPECIAL;
var COLLECTION = ARR | OBJ;
var ALL = ATOM | COLLECTION;
var Allow = {
  STR,
  NUM,
  ARR,
  OBJ,
  NULL,
  BOOL,
  NAN,
  INFINITY,
  MINUS_INFINITY,
  INF,
  SPECIAL,
  ATOM,
  COLLECTION,
  ALL
};
var PartialJSON = class extends Error {
};
var MalformedJSON = class extends Error {
};
function parseJSON(jsonString, allowPartial = Allow.ALL) {
  if (typeof jsonString !== "string") {
    throw new TypeError(`expecting str, got ${typeof jsonString}`);
  }
  if (!jsonString.trim()) {
    throw new Error(`${jsonString} is empty`);
  }
  return _parseJSON(jsonString.trim(), allowPartial);
}
var _parseJSON = (jsonString, allow) => {
  const length = jsonString.length;
  let index = 0;
  const markPartialJSON = (msg) => {
    throw new PartialJSON(`${msg} at position ${index}`);
  };
  const throwMalformedError = (msg) => {
    throw new MalformedJSON(`${msg} at position ${index}`);
  };
  const parseAny = () => {
    skipBlank();
    if (index >= length)
      markPartialJSON("Unexpected end of input");
    if (jsonString[index] === '"')
      return parseStr();
    if (jsonString[index] === "{")
      return parseObj();
    if (jsonString[index] === "[")
      return parseArr();
    if (jsonString.substring(index, index + 4) === "null" || Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
      index += 4;
      return null;
    }
    if (jsonString.substring(index, index + 4) === "true" || Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
      index += 4;
      return true;
    }
    if (jsonString.substring(index, index + 5) === "false" || Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
      index += 5;
      return false;
    }
    if (jsonString.substring(index, index + 8) === "Infinity" || Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
      index += 8;
      return Infinity;
    }
    if (jsonString.substring(index, index + 9) === "-Infinity" || Allow.MINUS_INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
      index += 9;
      return -Infinity;
    }
    if (jsonString.substring(index, index + 3) === "NaN" || Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
      index += 3;
      return NaN;
    }
    return parseNum();
  };
  const parseStr = () => {
    const start = index;
    let escape2 = false;
    index++;
    while (index < length && (jsonString[index] !== '"' || escape2 && jsonString[index - 1] === "\\")) {
      escape2 = jsonString[index] === "\\" ? !escape2 : false;
      index++;
    }
    if (jsonString.charAt(index) == '"') {
      try {
        return JSON.parse(jsonString.substring(start, ++index - Number(escape2)));
      } catch (e) {
        throwMalformedError(String(e));
      }
    } else if (Allow.STR & allow) {
      try {
        return JSON.parse(jsonString.substring(start, index - Number(escape2)) + '"');
      } catch (e) {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + '"');
      }
    }
    markPartialJSON("Unterminated string literal");
  };
  const parseObj = () => {
    index++;
    skipBlank();
    const obj = {};
    try {
      while (jsonString[index] !== "}") {
        skipBlank();
        if (index >= length && Allow.OBJ & allow)
          return obj;
        const key = parseStr();
        skipBlank();
        index++;
        try {
          const value = parseAny();
          Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
        } catch (e) {
          if (Allow.OBJ & allow)
            return obj;
          else
            throw e;
        }
        skipBlank();
        if (jsonString[index] === ",")
          index++;
      }
    } catch (e) {
      if (Allow.OBJ & allow)
        return obj;
      else
        markPartialJSON("Expected '}' at end of object");
    }
    index++;
    return obj;
  };
  const parseArr = () => {
    index++;
    const arr = [];
    try {
      while (jsonString[index] !== "]") {
        arr.push(parseAny());
        skipBlank();
        if (jsonString[index] === ",") {
          index++;
        }
      }
    } catch (e) {
      if (Allow.ARR & allow) {
        return arr;
      }
      markPartialJSON("Expected ']' at end of array");
    }
    index++;
    return arr;
  };
  const parseNum = () => {
    if (index === 0) {
      if (jsonString === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        if (Allow.NUM & allow) {
          try {
            if ("." === jsonString[jsonString.length - 1])
              return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf(".")));
            return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
          } catch (e2) {
          }
        }
        throwMalformedError(String(e));
      }
    }
    const start = index;
    if (jsonString[index] === "-")
      index++;
    while (jsonString[index] && !",]}".includes(jsonString[index]))
      index++;
    if (index == length && !(Allow.NUM & allow))
      markPartialJSON("Unterminated number literal");
    try {
      return JSON.parse(jsonString.substring(start, index));
    } catch (e) {
      if (jsonString.substring(start, index) === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
      } catch (e2) {
        throwMalformedError(String(e2));
      }
    }
  };
  const skipBlank = () => {
    while (index < length && " \n\r	".includes(jsonString[index])) {
      index++;
    }
  };
  return parseAny();
};
var partialParse = (input) => parseJSON(input, Allow.ALL ^ Allow.NUM);

// node_modules/openai/lib/ChatCompletionStream.mjs
var _ChatCompletionStream_instances;
var _ChatCompletionStream_params;
var _ChatCompletionStream_choiceEventStates;
var _ChatCompletionStream_currentChatCompletionSnapshot;
var _ChatCompletionStream_beginRequest;
var _ChatCompletionStream_getChoiceEventState;
var _ChatCompletionStream_addChunk;
var _ChatCompletionStream_emitToolCallDoneEvent;
var _ChatCompletionStream_emitContentDoneEvents;
var _ChatCompletionStream_endRequest;
var _ChatCompletionStream_getAutoParseableResponseFormat;
var _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class _ChatCompletionStream extends AbstractChatCompletionRunner {
  constructor(params) {
    super();
    _ChatCompletionStream_instances.add(this);
    _ChatCompletionStream_params.set(this, void 0);
    _ChatCompletionStream_choiceEventStates.set(this, void 0);
    _ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
    __classPrivateFieldSet(this, _ChatCompletionStream_params, params, "f");
    __classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
  }
  get currentChatCompletionSnapshot() {
    return __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createChatCompletion(client, params, options) {
    const runner = new _ChatCompletionStream(params);
    runner._run(() => runner._runChatCompletion(client, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  async _createChatCompletion(client, params, options) {
    super._createChatCompletion;
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    const stream = await client.chat.completions.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const chunk of stream) {
      __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    let chatId;
    for await (const chunk of stream) {
      if (chatId && chatId !== chunk.id) {
        this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
      }
      __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
      chatId = chunk.id;
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  [(_ChatCompletionStream_params = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_choiceEventStates = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
  }, _ChatCompletionStream_getChoiceEventState = function _ChatCompletionStream_getChoiceEventState2(choice) {
    let state = __classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
    if (state) {
      return state;
    }
    state = {
      content_done: false,
      refusal_done: false,
      logprobs_content_done: false,
      logprobs_refusal_done: false,
      done_tool_calls: /* @__PURE__ */ new Set(),
      current_tool_call_index: null
    };
    __classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
    return state;
  }, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk2(chunk) {
    if (this.ended)
      return;
    const completion = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
    this._emit("chunk", chunk, completion);
    for (const choice of chunk.choices) {
      const choiceSnapshot = completion.choices[choice.index];
      if (choice.delta.content != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.content) {
        this._emit("content", choice.delta.content, choiceSnapshot.message.content);
        this._emit("content.delta", {
          delta: choice.delta.content,
          snapshot: choiceSnapshot.message.content,
          parsed: choiceSnapshot.message.parsed
        });
      }
      if (choice.delta.refusal != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.refusal) {
        this._emit("refusal.delta", {
          delta: choice.delta.refusal,
          snapshot: choiceSnapshot.message.refusal
        });
      }
      if (choice.logprobs?.content != null && choiceSnapshot.message?.role === "assistant") {
        this._emit("logprobs.content.delta", {
          content: choice.logprobs?.content,
          snapshot: choiceSnapshot.logprobs?.content ?? []
        });
      }
      if (choice.logprobs?.refusal != null && choiceSnapshot.message?.role === "assistant") {
        this._emit("logprobs.refusal.delta", {
          refusal: choice.logprobs?.refusal,
          snapshot: choiceSnapshot.logprobs?.refusal ?? []
        });
      }
      const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
      if (choiceSnapshot.finish_reason) {
        __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
        if (state.current_tool_call_index != null) {
          __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
        }
      }
      for (const toolCall of choice.delta.tool_calls ?? []) {
        if (state.current_tool_call_index !== toolCall.index) {
          __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
          if (state.current_tool_call_index != null) {
            __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
          }
        }
        state.current_tool_call_index = toolCall.index;
      }
      for (const toolCallDelta of choice.delta.tool_calls ?? []) {
        const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallDelta.index];
        if (!toolCallSnapshot?.type) {
          continue;
        }
        if (toolCallSnapshot?.type === "function") {
          this._emit("tool_calls.function.arguments.delta", {
            name: toolCallSnapshot.function?.name,
            index: toolCallDelta.index,
            arguments: toolCallSnapshot.function.arguments,
            parsed_arguments: toolCallSnapshot.function.parsed_arguments,
            arguments_delta: toolCallDelta.function?.arguments ?? ""
          });
        } else {
          assertNever(toolCallSnapshot?.type);
        }
      }
    }
  }, _ChatCompletionStream_emitToolCallDoneEvent = function _ChatCompletionStream_emitToolCallDoneEvent2(choiceSnapshot, toolCallIndex) {
    const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (state.done_tool_calls.has(toolCallIndex)) {
      return;
    }
    const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallIndex];
    if (!toolCallSnapshot) {
      throw new Error("no tool call snapshot");
    }
    if (!toolCallSnapshot.type) {
      throw new Error("tool call snapshot missing `type`");
    }
    if (toolCallSnapshot.type === "function") {
      const inputTool = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.tools?.find((tool) => isChatCompletionFunctionTool(tool) && tool.function.name === toolCallSnapshot.function.name);
      this._emit("tool_calls.function.arguments.done", {
        name: toolCallSnapshot.function.name,
        index: toolCallIndex,
        arguments: toolCallSnapshot.function.arguments,
        parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCallSnapshot.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCallSnapshot.function.arguments) : null
      });
    } else {
      assertNever(toolCallSnapshot.type);
    }
  }, _ChatCompletionStream_emitContentDoneEvents = function _ChatCompletionStream_emitContentDoneEvents2(choiceSnapshot) {
    const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (choiceSnapshot.message.content && !state.content_done) {
      state.content_done = true;
      const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this);
      this._emit("content.done", {
        content: choiceSnapshot.message.content,
        parsed: responseFormat ? responseFormat.$parseRaw(choiceSnapshot.message.content) : null
      });
    }
    if (choiceSnapshot.message.refusal && !state.refusal_done) {
      state.refusal_done = true;
      this._emit("refusal.done", { refusal: choiceSnapshot.message.refusal });
    }
    if (choiceSnapshot.logprobs?.content && !state.logprobs_content_done) {
      state.logprobs_content_done = true;
      this._emit("logprobs.content.done", { content: choiceSnapshot.logprobs.content });
    }
    if (choiceSnapshot.logprobs?.refusal && !state.logprobs_refusal_done) {
      state.logprobs_refusal_done = true;
      this._emit("logprobs.refusal.done", { refusal: choiceSnapshot.logprobs.refusal });
    }
  }, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
    __classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
    return finalizeChatCompletion(snapshot, __classPrivateFieldGet(this, _ChatCompletionStream_params, "f"));
  }, _ChatCompletionStream_getAutoParseableResponseFormat = function _ChatCompletionStream_getAutoParseableResponseFormat2() {
    const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.response_format;
    if (isAutoParsableResponseFormat(responseFormat)) {
      return responseFormat;
    }
    return null;
  }, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion2(chunk) {
    var _a3, _b, _c, _d;
    let snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    const { choices, ...rest } = chunk;
    if (!snapshot) {
      snapshot = __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
        ...rest,
        choices: []
      }, "f");
    } else {
      Object.assign(snapshot, rest);
    }
    for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
      let choice = snapshot.choices[index];
      if (!choice) {
        choice = snapshot.choices[index] = { finish_reason, index, message: {}, logprobs, ...other };
      }
      if (logprobs) {
        if (!choice.logprobs) {
          choice.logprobs = Object.assign({}, logprobs);
        } else {
          const { content: content2, refusal: refusal2, ...rest3 } = logprobs;
          assertIsEmpty(rest3);
          Object.assign(choice.logprobs, rest3);
          if (content2) {
            (_a3 = choice.logprobs).content ?? (_a3.content = []);
            choice.logprobs.content.push(...content2);
          }
          if (refusal2) {
            (_b = choice.logprobs).refusal ?? (_b.refusal = []);
            choice.logprobs.refusal.push(...refusal2);
          }
        }
      }
      if (finish_reason) {
        choice.finish_reason = finish_reason;
        if (__classPrivateFieldGet(this, _ChatCompletionStream_params, "f") && hasAutoParseableInput(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"))) {
          if (finish_reason === "length") {
            throw new LengthFinishReasonError();
          }
          if (finish_reason === "content_filter") {
            throw new ContentFilterFinishReasonError();
          }
        }
      }
      Object.assign(choice, other);
      if (!delta)
        continue;
      const { content, refusal, function_call, role, tool_calls, ...rest2 } = delta;
      assertIsEmpty(rest2);
      Object.assign(choice.message, rest2);
      if (refusal) {
        choice.message.refusal = (choice.message.refusal || "") + refusal;
      }
      if (role)
        choice.message.role = role;
      if (function_call) {
        if (!choice.message.function_call) {
          choice.message.function_call = function_call;
        } else {
          if (function_call.name)
            choice.message.function_call.name = function_call.name;
          if (function_call.arguments) {
            (_c = choice.message.function_call).arguments ?? (_c.arguments = "");
            choice.message.function_call.arguments += function_call.arguments;
          }
        }
      }
      if (content) {
        choice.message.content = (choice.message.content || "") + content;
        if (!choice.message.refusal && __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this)) {
          choice.message.parsed = partialParse(choice.message.content);
        }
      }
      if (tool_calls) {
        if (!choice.message.tool_calls)
          choice.message.tool_calls = [];
        for (const { index: index2, id, type, function: fn, ...rest3 } of tool_calls) {
          const tool_call = (_d = choice.message.tool_calls)[index2] ?? (_d[index2] = {});
          Object.assign(tool_call, rest3);
          if (id)
            tool_call.id = id;
          if (type)
            tool_call.type = type;
          if (fn)
            tool_call.function ?? (tool_call.function = { name: fn.name ?? "", arguments: "" });
          if (fn?.name)
            tool_call.function.name = fn.name;
          if (fn?.arguments) {
            tool_call.function.arguments += fn.arguments;
            if (shouldParseToolCall(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"), tool_call)) {
              tool_call.function.parsed_arguments = partialParse(tool_call.function.arguments);
            }
          }
        }
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("chunk", (chunk) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(chunk);
      } else {
        pushQueue.push(chunk);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function finalizeChatCompletion(snapshot, params) {
  const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
  const completion = {
    ...rest,
    id,
    choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
      if (!finish_reason) {
        throw new OpenAIError(`missing finish_reason for choice ${index}`);
      }
      const { content = null, function_call, tool_calls, ...messageRest } = message;
      const role = message.role;
      if (!role) {
        throw new OpenAIError(`missing role for choice ${index}`);
      }
      if (function_call) {
        const { arguments: args, name } = function_call;
        if (args == null) {
          throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
        }
        if (!name) {
          throw new OpenAIError(`missing function_call.name for choice ${index}`);
        }
        return {
          ...choiceRest,
          message: {
            content,
            function_call: { arguments: args, name },
            role,
            refusal: message.refusal ?? null
          },
          finish_reason,
          index,
          logprobs
        };
      }
      if (tool_calls) {
        return {
          ...choiceRest,
          index,
          finish_reason,
          logprobs,
          message: {
            ...messageRest,
            role,
            content,
            refusal: message.refusal ?? null,
            tool_calls: tool_calls.map((tool_call, i) => {
              const { function: fn, type, id: id2, ...toolRest } = tool_call;
              const { arguments: args, name, ...fnRest } = fn || {};
              if (id2 == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id
${str(snapshot)}`);
              }
              if (type == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type
${str(snapshot)}`);
              }
              if (name == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name
${str(snapshot)}`);
              }
              if (args == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments
${str(snapshot)}`);
              }
              return { ...toolRest, id: id2, type, function: { ...fnRest, name, arguments: args } };
            })
          }
        };
      }
      return {
        ...choiceRest,
        message: { ...messageRest, content, role, refusal: message.refusal ?? null },
        finish_reason,
        index,
        logprobs
      };
    }),
    created,
    model,
    object: "chat.completion",
    ...system_fingerprint ? { system_fingerprint } : {}
  };
  return maybeParseChatCompletion(completion, params);
}
function str(x) {
  return JSON.stringify(x);
}
function assertIsEmpty(obj) {
  return;
}
function assertNever(_x) {
}

// node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
var ChatCompletionStreamingRunner = class _ChatCompletionStreamingRunner extends ChatCompletionStream {
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStreamingRunner(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static runTools(client, params, options) {
    const runner = new _ChatCompletionStreamingRunner(
      // @ts-expect-error TODO these types are incompatible
      params
    );
    const opts = {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
};

// node_modules/openai/resources/chat/completions/completions.mjs
var Completions = class extends APIResource {
  constructor() {
    super(...arguments);
    this.messages = new Messages(this._client);
  }
  create(body, options) {
    return this._client.post("/chat/completions", { body, ...options, stream: body.stream ?? false });
  }
  /**
   * Get a stored chat completion. Only Chat Completions that have been created with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * const chatCompletion =
   *   await client.chat.completions.retrieve('completion_id');
   * ```
   */
  retrieve(completionID, options) {
    return this._client.get(path2`/chat/completions/${completionID}`, options);
  }
  /**
   * Modify a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be modified. Currently, the only
   * supported modification is to update the `metadata` field.
   *
   * @example
   * ```ts
   * const chatCompletion = await client.chat.completions.update(
   *   'completion_id',
   *   { metadata: { foo: 'string' } },
   * );
   * ```
   */
  update(completionID, body, options) {
    return this._client.post(path2`/chat/completions/${completionID}`, { body, ...options });
  }
  /**
   * List stored Chat Completions. Only Chat Completions that have been stored with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletion of client.chat.completions.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/chat/completions", CursorPage, { query, ...options });
  }
  /**
   * Delete a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be deleted.
   *
   * @example
   * ```ts
   * const chatCompletionDeleted =
   *   await client.chat.completions.delete('completion_id');
   * ```
   */
  delete(completionID, options) {
    return this._client.delete(path2`/chat/completions/${completionID}`, options);
  }
  parse(body, options) {
    validateInputTools(body.tools);
    return this._client.chat.completions.create(body, {
      ...options,
      headers: {
        ...options?.headers,
        "X-Stainless-Helper-Method": "chat.completions.parse"
      }
    })._thenUnwrap((completion) => parseChatCompletion(completion, body));
  }
  runTools(body, options) {
    if (body.stream) {
      return ChatCompletionStreamingRunner.runTools(this._client, body, options);
    }
    return ChatCompletionRunner.runTools(this._client, body, options);
  }
  /**
   * Creates a chat completion stream
   */
  stream(body, options) {
    return ChatCompletionStream.createChatCompletion(this._client, body, options);
  }
};
Completions.Messages = Messages;

// node_modules/openai/resources/chat/chat.mjs
var Chat = class extends APIResource {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this._client);
  }
};
Chat.Completions = Completions;

// node_modules/openai/internal/headers.mjs
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// node_modules/openai/resources/audio/speech.mjs
var Speech = class extends APIResource {
  /**
   * Generates audio from the input text.
   *
   * @example
   * ```ts
   * const speech = await client.audio.speech.create({
   *   input: 'input',
   *   model: 'string',
   *   voice: 'ash',
   * });
   *
   * const content = await speech.blob();
   * console.log(content);
   * ```
   */
  create(body, options) {
    return this._client.post("/audio/speech", {
      body,
      ...options,
      headers: buildHeaders([{ Accept: "application/octet-stream" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/audio/transcriptions.mjs
var Transcriptions = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/transcriptions", multipartFormRequestOptions({
      body,
      ...options,
      stream: body.stream ?? false,
      __metadata: { model: body.model }
    }, this._client));
  }
};

// node_modules/openai/resources/audio/translations.mjs
var Translations = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/translations", multipartFormRequestOptions({ body, ...options, __metadata: { model: body.model } }, this._client));
  }
};

// node_modules/openai/resources/audio/audio.mjs
var Audio = class extends APIResource {
  constructor() {
    super(...arguments);
    this.transcriptions = new Transcriptions(this._client);
    this.translations = new Translations(this._client);
    this.speech = new Speech(this._client);
  }
};
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;

// node_modules/openai/resources/batches.mjs
var Batches = class extends APIResource {
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(body, options) {
    return this._client.post("/batches", { body, ...options });
  }
  /**
   * Retrieves a batch.
   */
  retrieve(batchID, options) {
    return this._client.get(path2`/batches/${batchID}`, options);
  }
  /**
   * List your organization's batches.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/batches", CursorPage, { query, ...options });
  }
  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
   * 10 minutes, before changing to `cancelled`, where it will have partial results
   * (if any) available in the output file.
   */
  cancel(batchID, options) {
    return this._client.post(path2`/batches/${batchID}/cancel`, options);
  }
};

// node_modules/openai/resources/beta/assistants.mjs
var Assistants = class extends APIResource {
  /**
   * Create an assistant with a model and instructions.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.create({
   *   model: 'gpt-4o',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/assistants", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves an assistant.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.retrieve(
   *   'assistant_id',
   * );
   * ```
   */
  retrieve(assistantID, options) {
    return this._client.get(path2`/assistants/${assistantID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies an assistant.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.update(
   *   'assistant_id',
   * );
   * ```
   */
  update(assistantID, body, options) {
    return this._client.post(path2`/assistants/${assistantID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of assistants.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const assistant of client.beta.assistants.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/assistants", CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete an assistant.
   *
   * @example
   * ```ts
   * const assistantDeleted =
   *   await client.beta.assistants.delete('assistant_id');
   * ```
   */
  delete(assistantID, options) {
    return this._client.delete(path2`/assistants/${assistantID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/sessions.mjs
var Sessions = class extends APIResource {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API. Can be configured with the same session parameters as the
   * `session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const session =
   *   await client.beta.realtime.sessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/sessions", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/transcription-sessions.mjs
var TranscriptionSessions = class extends APIResource {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API specifically for realtime transcriptions. Can be configured with
   * the same session parameters as the `transcription_session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const transcriptionSession =
   *   await client.beta.realtime.transcriptionSessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/transcription_sessions", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/realtime.mjs
var Realtime = class extends APIResource {
  constructor() {
    super(...arguments);
    this.sessions = new Sessions(this._client);
    this.transcriptionSessions = new TranscriptionSessions(this._client);
  }
};
Realtime.Sessions = Sessions;
Realtime.TranscriptionSessions = TranscriptionSessions;

// node_modules/openai/resources/beta/threads/messages.mjs
var Messages2 = class extends APIResource {
  /**
   * Create a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(threadID, body, options) {
    return this._client.post(path2`/threads/${threadID}/messages`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieve a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(messageID, params, options) {
    const { thread_id } = params;
    return this._client.get(path2`/threads/${thread_id}/messages/${messageID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(messageID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path2`/threads/${thread_id}/messages/${messageID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of messages for a given thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(threadID, query = {}, options) {
    return this._client.getAPIList(path2`/threads/${threadID}/messages`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Deletes a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(messageID, params, options) {
    const { thread_id } = params;
    return this._client.delete(path2`/threads/${thread_id}/messages/${messageID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/threads/runs/steps.mjs
var Steps = class extends APIResource {
  /**
   * Retrieves a run step.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(stepID, params, options) {
    const { thread_id, run_id, ...query } = params;
    return this._client.get(path2`/threads/${thread_id}/runs/${run_id}/steps/${stepID}`, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of run steps belonging to a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(runID, params, options) {
    const { thread_id, ...query } = params;
    return this._client.getAPIList(path2`/threads/${thread_id}/runs/${runID}/steps`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/internal/utils/base64.mjs
var toFloat32Array = (base64Str) => {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64Str, "base64");
    return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
  } else {
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return Array.from(new Float32Array(bytes.buffer));
  }
};

// node_modules/openai/internal/utils/env.mjs
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() ?? void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim();
  }
  return void 0;
};

// node_modules/openai/lib/AssistantStream.mjs
var _AssistantStream_instances;
var _a;
var _AssistantStream_events;
var _AssistantStream_runStepSnapshots;
var _AssistantStream_messageSnapshots;
var _AssistantStream_messageSnapshot;
var _AssistantStream_finalRun;
var _AssistantStream_currentContentIndex;
var _AssistantStream_currentContent;
var _AssistantStream_currentToolCallIndex;
var _AssistantStream_currentToolCall;
var _AssistantStream_currentEvent;
var _AssistantStream_currentRunSnapshot;
var _AssistantStream_currentRunStepSnapshot;
var _AssistantStream_addEvent;
var _AssistantStream_endRequest;
var _AssistantStream_handleMessage;
var _AssistantStream_handleRunStep;
var _AssistantStream_handleEvent;
var _AssistantStream_accumulateRunStep;
var _AssistantStream_accumulateMessage;
var _AssistantStream_accumulateContent;
var _AssistantStream_handleRun;
var AssistantStream = class extends EventStream {
  constructor() {
    super(...arguments);
    _AssistantStream_instances.add(this);
    _AssistantStream_events.set(this, []);
    _AssistantStream_runStepSnapshots.set(this, {});
    _AssistantStream_messageSnapshots.set(this, {});
    _AssistantStream_messageSnapshot.set(this, void 0);
    _AssistantStream_finalRun.set(this, void 0);
    _AssistantStream_currentContentIndex.set(this, void 0);
    _AssistantStream_currentContent.set(this, void 0);
    _AssistantStream_currentToolCallIndex.set(this, void 0);
    _AssistantStream_currentToolCall.set(this, void 0);
    _AssistantStream_currentEvent.set(this, void 0);
    _AssistantStream_currentRunSnapshot.set(this, void 0);
    _AssistantStream_currentRunStepSnapshot.set(this, void 0);
  }
  [(_AssistantStream_events = /* @__PURE__ */ new WeakMap(), _AssistantStream_runStepSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_finalRun = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContentIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCallIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCall = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentEvent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunStepSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_instances = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  static fromReadableStream(stream) {
    const runner = new _a();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
  static createToolAssistantStream(runId, runs, params, options) {
    const runner = new _a();
    runner._run(() => runner._runToolAssistantStream(runId, runs, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createToolAssistantStream(run, runId, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.submitToolOutputs(runId, body, {
      ...options,
      signal: this.controller.signal
    });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static createThreadAssistantStream(params, thread, options) {
    const runner = new _a();
    runner._run(() => runner._threadAssistantStream(params, thread, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  static createAssistantStream(threadId, runs, params, options) {
    const runner = new _a();
    runner._run(() => runner._runAssistantStream(threadId, runs, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  currentEvent() {
    return __classPrivateFieldGet(this, _AssistantStream_currentEvent, "f");
  }
  currentRun() {
    return __classPrivateFieldGet(this, _AssistantStream_currentRunSnapshot, "f");
  }
  currentMessageSnapshot() {
    return __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f");
  }
  currentRunStepSnapshot() {
    return __classPrivateFieldGet(this, _AssistantStream_currentRunStepSnapshot, "f");
  }
  async finalRunSteps() {
    await this.done();
    return Object.values(__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f"));
  }
  async finalMessages() {
    await this.done();
    return Object.values(__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f"));
  }
  async finalRun() {
    await this.done();
    if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f"))
      throw Error("Final run was not received.");
    return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
  }
  async _createThreadAssistantStream(thread, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await thread.createAndRun(body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  async _createAssistantStream(run, threadId, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.create(threadId, body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static accumulateDelta(acc, delta) {
    for (const [key, deltaValue] of Object.entries(delta)) {
      if (!acc.hasOwnProperty(key)) {
        acc[key] = deltaValue;
        continue;
      }
      let accValue = acc[key];
      if (accValue === null || accValue === void 0) {
        acc[key] = deltaValue;
        continue;
      }
      if (key === "index" || key === "type") {
        acc[key] = deltaValue;
        continue;
      }
      if (typeof accValue === "string" && typeof deltaValue === "string") {
        accValue += deltaValue;
      } else if (typeof accValue === "number" && typeof deltaValue === "number") {
        accValue += deltaValue;
      } else if (isObj(accValue) && isObj(deltaValue)) {
        accValue = this.accumulateDelta(accValue, deltaValue);
      } else if (Array.isArray(accValue) && Array.isArray(deltaValue)) {
        if (accValue.every((x) => typeof x === "string" || typeof x === "number")) {
          accValue.push(...deltaValue);
          continue;
        }
        for (const deltaEntry of deltaValue) {
          if (!isObj(deltaEntry)) {
            throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
          }
          const index = deltaEntry["index"];
          if (index == null) {
            console.error(deltaEntry);
            throw new Error("Expected array delta entry to have an `index` property");
          }
          if (typeof index !== "number") {
            throw new Error(`Expected array delta entry \`index\` property to be a number but got ${index}`);
          }
          const accEntry = accValue[index];
          if (accEntry == null) {
            accValue.push(deltaEntry);
          } else {
            accValue[index] = this.accumulateDelta(accEntry, deltaEntry);
          }
        }
        continue;
      } else {
        throw Error(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accValue}`);
      }
      acc[key] = accValue;
    }
    return acc;
  }
  _addRun(run) {
    return run;
  }
  async _threadAssistantStream(params, thread, options) {
    return await this._createThreadAssistantStream(thread, params, options);
  }
  async _runAssistantStream(threadId, runs, params, options) {
    return await this._createAssistantStream(runs, threadId, params, options);
  }
  async _runToolAssistantStream(runId, runs, params, options) {
    return await this._createToolAssistantStream(runs, runId, params, options);
  }
};
_a = AssistantStream, _AssistantStream_addEvent = function _AssistantStream_addEvent2(event) {
  if (this.ended)
    return;
  __classPrivateFieldSet(this, _AssistantStream_currentEvent, event, "f");
  __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
  switch (event.event) {
    case "thread.created":
      break;
    case "thread.run.created":
    case "thread.run.queued":
    case "thread.run.in_progress":
    case "thread.run.requires_action":
    case "thread.run.completed":
    case "thread.run.incomplete":
    case "thread.run.failed":
    case "thread.run.cancelling":
    case "thread.run.cancelled":
    case "thread.run.expired":
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
      break;
    case "thread.run.step.created":
    case "thread.run.step.in_progress":
    case "thread.run.step.delta":
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
      break;
    case "thread.message.created":
    case "thread.message.in_progress":
    case "thread.message.delta":
    case "thread.message.completed":
    case "thread.message.incomplete":
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
      break;
    case "error":
      throw new Error("Encountered an error event in event processing - errors should be processed earlier");
    default:
      assertNever2(event);
  }
}, _AssistantStream_endRequest = function _AssistantStream_endRequest2() {
  if (this.ended) {
    throw new OpenAIError(`stream has ended, this shouldn't happen`);
  }
  if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f"))
    throw Error("Final run has not been received");
  return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
}, _AssistantStream_handleMessage = function _AssistantStream_handleMessage2(event) {
  const [accumulatedMessage, newContent] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
  __classPrivateFieldSet(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
  __classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
  for (const content of newContent) {
    const snapshotContent = accumulatedMessage.content[content.index];
    if (snapshotContent?.type == "text") {
      this._emit("textCreated", snapshotContent.text);
    }
  }
  switch (event.event) {
    case "thread.message.created":
      this._emit("messageCreated", event.data);
      break;
    case "thread.message.in_progress":
      break;
    case "thread.message.delta":
      this._emit("messageDelta", event.data.delta, accumulatedMessage);
      if (event.data.delta.content) {
        for (const content of event.data.delta.content) {
          if (content.type == "text" && content.text) {
            let textDelta = content.text;
            let snapshot = accumulatedMessage.content[content.index];
            if (snapshot && snapshot.type == "text") {
              this._emit("textDelta", textDelta, snapshot.text);
            } else {
              throw Error("The snapshot associated with this text delta is not text or missing");
            }
          }
          if (content.index != __classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")) {
            if (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f")) {
              switch (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").type) {
                case "text":
                  this._emit("textDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                  break;
                case "image_file":
                  this._emit("imageFileDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                  break;
              }
            }
            __classPrivateFieldSet(this, _AssistantStream_currentContentIndex, content.index, "f");
          }
          __classPrivateFieldSet(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
        }
      }
      break;
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f") !== void 0) {
        const currentContent = event.data.content[__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")];
        if (currentContent) {
          switch (currentContent.type) {
            case "image_file":
              this._emit("imageFileDone", currentContent.image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
              break;
            case "text":
              this._emit("textDone", currentContent.text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
              break;
          }
        }
      }
      if (__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f")) {
        this._emit("messageDone", event.data);
      }
      __classPrivateFieldSet(this, _AssistantStream_messageSnapshot, void 0, "f");
  }
}, _AssistantStream_handleRunStep = function _AssistantStream_handleRunStep2(event) {
  const accumulatedRunStep = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
  __classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
  switch (event.event) {
    case "thread.run.step.created":
      this._emit("runStepCreated", event.data);
      break;
    case "thread.run.step.delta":
      const delta = event.data.delta;
      if (delta.step_details && delta.step_details.type == "tool_calls" && delta.step_details.tool_calls && accumulatedRunStep.step_details.type == "tool_calls") {
        for (const toolCall of delta.step_details.tool_calls) {
          if (toolCall.index == __classPrivateFieldGet(this, _AssistantStream_currentToolCallIndex, "f")) {
            this._emit("toolCallDelta", toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
          } else {
            if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
              this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
            }
            __classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
            __classPrivateFieldSet(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
            if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"))
              this._emit("toolCallCreated", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
          }
        }
      }
      this._emit("runStepDelta", event.data.delta, accumulatedRunStep);
      break;
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, void 0, "f");
      const details = event.data.step_details;
      if (details.type == "tool_calls") {
        if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
          this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
          __classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
        }
      }
      this._emit("runStepDone", event.data, accumulatedRunStep);
      break;
    case "thread.run.step.in_progress":
      break;
  }
}, _AssistantStream_handleEvent = function _AssistantStream_handleEvent2(event) {
  __classPrivateFieldGet(this, _AssistantStream_events, "f").push(event);
  this._emit("event", event);
}, _AssistantStream_accumulateRunStep = function _AssistantStream_accumulateRunStep2(event) {
  switch (event.event) {
    case "thread.run.step.created":
      __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      return event.data;
    case "thread.run.step.delta":
      let snapshot = __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
      if (!snapshot) {
        throw Error("Received a RunStepDelta before creation of a snapshot");
      }
      let data = event.data;
      if (data.delta) {
        const accumulated = _a.accumulateDelta(snapshot, data.delta);
        __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
      }
      return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
    case "thread.run.step.in_progress":
      __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      break;
  }
  if (__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id])
    return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
  throw new Error("No snapshot available");
}, _AssistantStream_accumulateMessage = function _AssistantStream_accumulateMessage2(event, snapshot) {
  let newContent = [];
  switch (event.event) {
    case "thread.message.created":
      return [event.data, newContent];
    case "thread.message.delta":
      if (!snapshot) {
        throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
      }
      let data = event.data;
      if (data.delta.content) {
        for (const contentElement of data.delta.content) {
          if (contentElement.index in snapshot.content) {
            let currentContent = snapshot.content[contentElement.index];
            snapshot.content[contentElement.index] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent);
          } else {
            snapshot.content[contentElement.index] = contentElement;
            newContent.push(contentElement);
          }
        }
      }
      return [snapshot, newContent];
    case "thread.message.in_progress":
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (snapshot) {
        return [snapshot, newContent];
      } else {
        throw Error("Received thread message event with no existing snapshot");
      }
  }
  throw Error("Tried to accumulate a non-message event");
}, _AssistantStream_accumulateContent = function _AssistantStream_accumulateContent2(contentElement, currentContent) {
  return _a.accumulateDelta(currentContent, contentElement);
}, _AssistantStream_handleRun = function _AssistantStream_handleRun2(event) {
  __classPrivateFieldSet(this, _AssistantStream_currentRunSnapshot, event.data, "f");
  switch (event.event) {
    case "thread.run.created":
      break;
    case "thread.run.queued":
      break;
    case "thread.run.in_progress":
      break;
    case "thread.run.requires_action":
    case "thread.run.cancelled":
    case "thread.run.failed":
    case "thread.run.completed":
    case "thread.run.expired":
    case "thread.run.incomplete":
      __classPrivateFieldSet(this, _AssistantStream_finalRun, event.data, "f");
      if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
        this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
        __classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
      }
      break;
    case "thread.run.cancelling":
      break;
  }
};
function assertNever2(_x) {
}

// node_modules/openai/resources/beta/threads/runs/runs.mjs
var Runs = class extends APIResource {
  constructor() {
    super(...arguments);
    this.steps = new Steps(this._client);
  }
  create(threadID, params, options) {
    const { include, ...body } = params;
    return this._client.post(path2`/threads/${threadID}/runs`, {
      query: { include },
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: params.stream ?? false
    });
  }
  /**
   * Retrieves a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(runID, params, options) {
    const { thread_id } = params;
    return this._client.get(path2`/threads/${thread_id}/runs/${runID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(runID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path2`/threads/${thread_id}/runs/${runID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of runs belonging to a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(threadID, query = {}, options) {
    return this._client.getAPIList(path2`/threads/${threadID}/runs`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Cancels a run that is `in_progress`.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  cancel(runID, params, options) {
    const { thread_id } = params;
    return this._client.post(path2`/threads/${thread_id}/runs/${runID}/cancel`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * A helper to create a run an poll for a terminal state. More information on Run
   * lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndPoll(threadId, body, options) {
    const run = await this.create(threadId, body, options);
    return await this.poll(run.id, { thread_id: threadId }, options);
  }
  /**
   * Create a Run stream
   *
   * @deprecated use `stream` instead
   */
  createAndStream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  /**
   * A helper to poll a run status until it reaches a terminal state. More
   * information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async poll(runId, params, options) {
    const headers = buildHeaders([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const { data: run, response } = await this.retrieve(runId, params, {
        ...options,
        headers: { ...options?.headers, ...headers }
      }).withResponse();
      switch (run.status) {
        //If we are in any sort of intermediate state we poll
        case "queued":
        case "in_progress":
        case "cancelling":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        //We return the run in any terminal state.
        case "requires_action":
        case "incomplete":
        case "cancelled":
        case "completed":
        case "failed":
        case "expired":
          return run;
      }
    }
  }
  /**
   * Create a Run stream
   */
  stream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  submitToolOutputs(runID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path2`/threads/${thread_id}/runs/${runID}/submit_tool_outputs`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: params.stream ?? false
    });
  }
  /**
   * A helper to submit a tool output to a run and poll for a terminal run state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async submitToolOutputsAndPoll(runId, params, options) {
    const run = await this.submitToolOutputs(runId, params, options);
    return await this.poll(run.id, params, options);
  }
  /**
   * Submit the tool outputs from a previous run and stream the run to a terminal
   * state. More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  submitToolOutputsStream(runId, params, options) {
    return AssistantStream.createToolAssistantStream(runId, this._client.beta.threads.runs, params, options);
  }
};
Runs.Steps = Steps;

// node_modules/openai/resources/beta/threads/threads.mjs
var Threads = class extends APIResource {
  constructor() {
    super(...arguments);
    this.runs = new Runs(this._client);
    this.messages = new Messages2(this._client);
  }
  /**
   * Create a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(body = {}, options) {
    return this._client.post("/threads", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadID, options) {
    return this._client.get(path2`/threads/${threadID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(threadID, body, options) {
    return this._client.post(path2`/threads/${threadID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(threadID, options) {
    return this._client.delete(path2`/threads/${threadID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  createAndRun(body, options) {
    return this._client.post("/threads/runs", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: body.stream ?? false
    });
  }
  /**
   * A helper to create a thread, start a run and then poll for a terminal state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndRunPoll(body, options) {
    const run = await this.createAndRun(body, options);
    return await this.runs.poll(run.id, { thread_id: run.thread_id }, options);
  }
  /**
   * Create a thread and stream the run back
   */
  createAndRunStream(body, options) {
    return AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
  }
};
Threads.Runs = Runs;
Threads.Messages = Messages2;

// node_modules/openai/resources/beta/beta.mjs
var Beta = class extends APIResource {
  constructor() {
    super(...arguments);
    this.realtime = new Realtime(this._client);
    this.assistants = new Assistants(this._client);
    this.threads = new Threads(this._client);
  }
};
Beta.Realtime = Realtime;
Beta.Assistants = Assistants;
Beta.Threads = Threads;

// node_modules/openai/resources/completions.mjs
var Completions2 = class extends APIResource {
  create(body, options) {
    return this._client.post("/completions", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/openai/resources/containers/files/content.mjs
var Content = class extends APIResource {
  /**
   * Retrieve Container File Content
   */
  retrieve(fileID, params, options) {
    const { container_id } = params;
    return this._client.get(path2`/containers/${container_id}/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/containers/files/files.mjs
var Files = class extends APIResource {
  constructor() {
    super(...arguments);
    this.content = new Content(this._client);
  }
  /**
   * Create a Container File
   *
   * You can send either a multipart/form-data request with the raw file content, or
   * a JSON request with a file ID.
   */
  create(containerID, body, options) {
    return this._client.post(path2`/containers/${containerID}/files`, multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Retrieve Container File
   */
  retrieve(fileID, params, options) {
    const { container_id } = params;
    return this._client.get(path2`/containers/${container_id}/files/${fileID}`, options);
  }
  /**
   * List Container files
   */
  list(containerID, query = {}, options) {
    return this._client.getAPIList(path2`/containers/${containerID}/files`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete Container File
   */
  delete(fileID, params, options) {
    const { container_id } = params;
    return this._client.delete(path2`/containers/${container_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
};
Files.Content = Content;

// node_modules/openai/resources/containers/containers.mjs
var Containers = class extends APIResource {
  constructor() {
    super(...arguments);
    this.files = new Files(this._client);
  }
  /**
   * Create Container
   */
  create(body, options) {
    return this._client.post("/containers", { body, ...options });
  }
  /**
   * Retrieve Container
   */
  retrieve(containerID, options) {
    return this._client.get(path2`/containers/${containerID}`, options);
  }
  /**
   * List Containers
   */
  list(query = {}, options) {
    return this._client.getAPIList("/containers", CursorPage, { query, ...options });
  }
  /**
   * Delete Container
   */
  delete(containerID, options) {
    return this._client.delete(path2`/containers/${containerID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
};
Containers.Files = Files;

// node_modules/openai/resources/conversations/items.mjs
var Items = class extends APIResource {
  /**
   * Create items in a conversation with the given ID.
   */
  create(conversationID, params, options) {
    const { include, ...body } = params;
    return this._client.post(path2`/conversations/${conversationID}/items`, {
      query: { include },
      body,
      ...options
    });
  }
  /**
   * Get a single item from a conversation with the given IDs.
   */
  retrieve(itemID, params, options) {
    const { conversation_id, ...query } = params;
    return this._client.get(path2`/conversations/${conversation_id}/items/${itemID}`, { query, ...options });
  }
  /**
   * List all items for a conversation with the given ID.
   */
  list(conversationID, query = {}, options) {
    return this._client.getAPIList(path2`/conversations/${conversationID}/items`, ConversationCursorPage, { query, ...options });
  }
  /**
   * Delete an item from a conversation with the given IDs.
   */
  delete(itemID, params, options) {
    const { conversation_id } = params;
    return this._client.delete(path2`/conversations/${conversation_id}/items/${itemID}`, options);
  }
};

// node_modules/openai/resources/conversations/conversations.mjs
var Conversations = class extends APIResource {
  constructor() {
    super(...arguments);
    this.items = new Items(this._client);
  }
  /**
   * Create a conversation.
   */
  create(body = {}, options) {
    return this._client.post("/conversations", { body, ...options });
  }
  /**
   * Get a conversation
   */
  retrieve(conversationID, options) {
    return this._client.get(path2`/conversations/${conversationID}`, options);
  }
  /**
   * Update a conversation
   */
  update(conversationID, body, options) {
    return this._client.post(path2`/conversations/${conversationID}`, { body, ...options });
  }
  /**
   * Delete a conversation. Items in the conversation will not be deleted.
   */
  delete(conversationID, options) {
    return this._client.delete(path2`/conversations/${conversationID}`, options);
  }
};
Conversations.Items = Items;

// node_modules/openai/resources/embeddings.mjs
var Embeddings = class extends APIResource {
  /**
   * Creates an embedding vector representing the input text.
   *
   * @example
   * ```ts
   * const createEmbeddingResponse =
   *   await client.embeddings.create({
   *     input: 'The quick brown fox jumped over the lazy dog',
   *     model: 'text-embedding-3-small',
   *   });
   * ```
   */
  create(body, options) {
    const hasUserProvidedEncodingFormat = !!body.encoding_format;
    let encoding_format = hasUserProvidedEncodingFormat ? body.encoding_format : "base64";
    if (hasUserProvidedEncodingFormat) {
      loggerFor(this._client).debug("embeddings/user defined encoding_format:", body.encoding_format);
    }
    const response = this._client.post("/embeddings", {
      body: {
        ...body,
        encoding_format
      },
      ...options
    });
    if (hasUserProvidedEncodingFormat) {
      return response;
    }
    loggerFor(this._client).debug("embeddings/decoding base64 embeddings from base64");
    return response._thenUnwrap((response2) => {
      if (response2 && response2.data) {
        response2.data.forEach((embeddingBase64Obj) => {
          const embeddingBase64Str = embeddingBase64Obj.embedding;
          embeddingBase64Obj.embedding = toFloat32Array(embeddingBase64Str);
        });
      }
      return response2;
    });
  }
};

// node_modules/openai/resources/evals/runs/output-items.mjs
var OutputItems = class extends APIResource {
  /**
   * Get an evaluation run output item by ID.
   */
  retrieve(outputItemID, params, options) {
    const { eval_id, run_id } = params;
    return this._client.get(path2`/evals/${eval_id}/runs/${run_id}/output_items/${outputItemID}`, options);
  }
  /**
   * Get a list of output items for an evaluation run.
   */
  list(runID, params, options) {
    const { eval_id, ...query } = params;
    return this._client.getAPIList(path2`/evals/${eval_id}/runs/${runID}/output_items`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/evals/runs/runs.mjs
var Runs2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.outputItems = new OutputItems(this._client);
  }
  /**
   * Kicks off a new run for a given evaluation, specifying the data source, and what
   * model configuration to use to test. The datasource will be validated against the
   * schema specified in the config of the evaluation.
   */
  create(evalID, body, options) {
    return this._client.post(path2`/evals/${evalID}/runs`, { body, ...options });
  }
  /**
   * Get an evaluation run by ID.
   */
  retrieve(runID, params, options) {
    const { eval_id } = params;
    return this._client.get(path2`/evals/${eval_id}/runs/${runID}`, options);
  }
  /**
   * Get a list of runs for an evaluation.
   */
  list(evalID, query = {}, options) {
    return this._client.getAPIList(path2`/evals/${evalID}/runs`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete an eval run.
   */
  delete(runID, params, options) {
    const { eval_id } = params;
    return this._client.delete(path2`/evals/${eval_id}/runs/${runID}`, options);
  }
  /**
   * Cancel an ongoing evaluation run.
   */
  cancel(runID, params, options) {
    const { eval_id } = params;
    return this._client.post(path2`/evals/${eval_id}/runs/${runID}`, options);
  }
};
Runs2.OutputItems = OutputItems;

// node_modules/openai/resources/evals/evals.mjs
var Evals = class extends APIResource {
  constructor() {
    super(...arguments);
    this.runs = new Runs2(this._client);
  }
  /**
   * Create the structure of an evaluation that can be used to test a model's
   * performance. An evaluation is a set of testing criteria and the config for a
   * data source, which dictates the schema of the data used in the evaluation. After
   * creating an evaluation, you can run it on different models and model parameters.
   * We support several types of graders and datasources. For more information, see
   * the [Evals guide](https://platform.openai.com/docs/guides/evals).
   */
  create(body, options) {
    return this._client.post("/evals", { body, ...options });
  }
  /**
   * Get an evaluation by ID.
   */
  retrieve(evalID, options) {
    return this._client.get(path2`/evals/${evalID}`, options);
  }
  /**
   * Update certain properties of an evaluation.
   */
  update(evalID, body, options) {
    return this._client.post(path2`/evals/${evalID}`, { body, ...options });
  }
  /**
   * List evaluations for a project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/evals", CursorPage, { query, ...options });
  }
  /**
   * Delete an evaluation.
   */
  delete(evalID, options) {
    return this._client.delete(path2`/evals/${evalID}`, options);
  }
};
Evals.Runs = Runs2;

// node_modules/openai/resources/files.mjs
var Files2 = class extends APIResource {
  /**
   * Upload a file that can be used across various endpoints. Individual files can be
   * up to 512 MB, and the size of all files uploaded by one organization can be up
   * to 1 TB.
   *
   * The Assistants API supports files up to 2 million tokens and of specific file
   * types. See the
   * [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools) for
   * details.
   *
   * The Fine-tuning API only supports `.jsonl` files. The input also has certain
   * required formats for fine-tuning
   * [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input) or
   * [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
   * models.
   *
   * The Batch API only supports `.jsonl` files up to 200 MB in size. The input also
   * has a specific required
   * [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  create(body, options) {
    return this._client.post("/files", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Returns information about a specific file.
   */
  retrieve(fileID, options) {
    return this._client.get(path2`/files/${fileID}`, options);
  }
  /**
   * Returns a list of files.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/files", CursorPage, { query, ...options });
  }
  /**
   * Delete a file.
   */
  delete(fileID, options) {
    return this._client.delete(path2`/files/${fileID}`, options);
  }
  /**
   * Returns the contents of the specified file.
   */
  content(fileID, options) {
    return this._client.get(path2`/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * Waits for the given file to be processed, default timeout is 30 mins.
   */
  async waitForProcessing(id, { pollInterval = 5e3, maxWait = 30 * 60 * 1e3 } = {}) {
    const TERMINAL_STATES = /* @__PURE__ */ new Set(["processed", "error", "deleted"]);
    const start = Date.now();
    let file = await this.retrieve(id);
    while (!file.status || !TERMINAL_STATES.has(file.status)) {
      await sleep(pollInterval);
      file = await this.retrieve(id);
      if (Date.now() - start > maxWait) {
        throw new APIConnectionTimeoutError({
          message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.`
        });
      }
    }
    return file;
  }
};

// node_modules/openai/resources/fine-tuning/methods.mjs
var Methods = class extends APIResource {
};

// node_modules/openai/resources/fine-tuning/alpha/graders.mjs
var Graders = class extends APIResource {
  /**
   * Run a grader.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.alpha.graders.run({
   *   grader: {
   *     input: 'input',
   *     name: 'name',
   *     operation: 'eq',
   *     reference: 'reference',
   *     type: 'string_check',
   *   },
   *   model_sample: 'model_sample',
   * });
   * ```
   */
  run(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/run", { body, ...options });
  }
  /**
   * Validate a grader.
   *
   * @example
   * ```ts
   * const response =
   *   await client.fineTuning.alpha.graders.validate({
   *     grader: {
   *       input: 'input',
   *       name: 'name',
   *       operation: 'eq',
   *       reference: 'reference',
   *       type: 'string_check',
   *     },
   *   });
   * ```
   */
  validate(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/validate", { body, ...options });
  }
};

// node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
var Alpha = class extends APIResource {
  constructor() {
    super(...arguments);
    this.graders = new Graders(this._client);
  }
};
Alpha.Graders = Graders;

// node_modules/openai/resources/fine-tuning/checkpoints/permissions.mjs
var Permissions = class extends APIResource {
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects
   * in their organization.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
   *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *   { project_ids: ['string'] },
   * )) {
   *   // ...
   * }
   * ```
   */
  create(fineTunedModelCheckpoint, body, options) {
    return this._client.getAPIList(path2`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, Page, { body, method: "post", ...options });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.retrieve(
   *     'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   *   );
   * ```
   */
  retrieve(fineTunedModelCheckpoint, query = {}, options) {
    return this._client.get(path2`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
      query,
      ...options
    });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.delete(
   *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
   *     {
   *       fine_tuned_model_checkpoint:
   *         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *     },
   *   );
   * ```
   */
  delete(permissionID, params, options) {
    const { fine_tuned_model_checkpoint } = params;
    return this._client.delete(path2`/fine_tuning/checkpoints/${fine_tuned_model_checkpoint}/permissions/${permissionID}`, options);
  }
};

// node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
var Checkpoints = class extends APIResource {
  constructor() {
    super(...arguments);
    this.permissions = new Permissions(this._client);
  }
};
Checkpoints.Permissions = Permissions;

// node_modules/openai/resources/fine-tuning/jobs/checkpoints.mjs
var Checkpoints2 = class extends APIResource {
  /**
   * List checkpoints for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(fineTuningJobID, query = {}, options) {
    return this._client.getAPIList(path2`/fine_tuning/jobs/${fineTuningJobID}/checkpoints`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
var Jobs = class extends APIResource {
  constructor() {
    super(...arguments);
    this.checkpoints = new Checkpoints2(this._client);
  }
  /**
   * Creates a fine-tuning job which begins the process of creating a new model from
   * a given dataset.
   *
   * Response includes details of the enqueued job including job status and the name
   * of the fine-tuned models once complete.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.create({
   *   model: 'gpt-4o-mini',
   *   training_file: 'file-abc123',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/fine_tuning/jobs", { body, ...options });
  }
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.retrieve(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  retrieve(fineTuningJobID, options) {
    return this._client.get(path2`/fine_tuning/jobs/${fineTuningJobID}`, options);
  }
  /**
   * List your organization's fine-tuning jobs
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJob of client.fineTuning.jobs.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/fine_tuning/jobs", CursorPage, { query, ...options });
  }
  /**
   * Immediately cancel a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.cancel(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  cancel(fineTuningJobID, options) {
    return this._client.post(path2`/fine_tuning/jobs/${fineTuningJobID}/cancel`, options);
  }
  /**
   * Get status updates for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  listEvents(fineTuningJobID, query = {}, options) {
    return this._client.getAPIList(path2`/fine_tuning/jobs/${fineTuningJobID}/events`, CursorPage, { query, ...options });
  }
  /**
   * Pause a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.pause(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  pause(fineTuningJobID, options) {
    return this._client.post(path2`/fine_tuning/jobs/${fineTuningJobID}/pause`, options);
  }
  /**
   * Resume a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.resume(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  resume(fineTuningJobID, options) {
    return this._client.post(path2`/fine_tuning/jobs/${fineTuningJobID}/resume`, options);
  }
};
Jobs.Checkpoints = Checkpoints2;

// node_modules/openai/resources/fine-tuning/fine-tuning.mjs
var FineTuning = class extends APIResource {
  constructor() {
    super(...arguments);
    this.methods = new Methods(this._client);
    this.jobs = new Jobs(this._client);
    this.checkpoints = new Checkpoints(this._client);
    this.alpha = new Alpha(this._client);
  }
};
FineTuning.Methods = Methods;
FineTuning.Jobs = Jobs;
FineTuning.Checkpoints = Checkpoints;
FineTuning.Alpha = Alpha;

// node_modules/openai/resources/graders/grader-models.mjs
var GraderModels = class extends APIResource {
};

// node_modules/openai/resources/graders/graders.mjs
var Graders2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.graderModels = new GraderModels(this._client);
  }
};
Graders2.GraderModels = GraderModels;

// node_modules/openai/resources/images.mjs
var Images = class extends APIResource {
  /**
   * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.createVariation({
   *   image: fs.createReadStream('otter.png'),
   * });
   * ```
   */
  createVariation(body, options) {
    return this._client.post("/images/variations", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  edit(body, options) {
    return this._client.post("/images/edits", multipartFormRequestOptions({ body, ...options, stream: body.stream ?? false }, this._client));
  }
  generate(body, options) {
    return this._client.post("/images/generations", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/openai/resources/models.mjs
var Models = class extends APIResource {
  /**
   * Retrieves a model instance, providing basic information about the model such as
   * the owner and permissioning.
   */
  retrieve(model, options) {
    return this._client.get(path2`/models/${model}`, options);
  }
  /**
   * Lists the currently available models, and provides basic information about each
   * one such as the owner and availability.
   */
  list(options) {
    return this._client.getAPIList("/models", Page, options);
  }
  /**
   * Delete a fine-tuned model. You must have the Owner role in your organization to
   * delete a model.
   */
  delete(model, options) {
    return this._client.delete(path2`/models/${model}`, options);
  }
};

// node_modules/openai/resources/moderations.mjs
var Moderations = class extends APIResource {
  /**
   * Classifies if text and/or image inputs are potentially harmful. Learn more in
   * the [moderation guide](https://platform.openai.com/docs/guides/moderation).
   */
  create(body, options) {
    return this._client.post("/moderations", { body, ...options });
  }
};

// node_modules/openai/resources/realtime/client-secrets.mjs
var ClientSecrets = class extends APIResource {
  /**
   * Create a Realtime client secret with an associated session configuration.
   */
  create(body, options) {
    return this._client.post("/realtime/client_secrets", { body, ...options });
  }
};

// node_modules/openai/resources/realtime/realtime.mjs
var Realtime2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.clientSecrets = new ClientSecrets(this._client);
  }
};
Realtime2.ClientSecrets = ClientSecrets;

// node_modules/openai/lib/ResponsesParser.mjs
function maybeParseResponse(response, params) {
  if (!params || !hasAutoParseableInput2(params)) {
    return {
      ...response,
      output_parsed: null,
      output: response.output.map((item) => {
        if (item.type === "function_call") {
          return {
            ...item,
            parsed_arguments: null
          };
        }
        if (item.type === "message") {
          return {
            ...item,
            content: item.content.map((content) => ({
              ...content,
              parsed: null
            }))
          };
        } else {
          return item;
        }
      })
    };
  }
  return parseResponse(response, params);
}
function parseResponse(response, params) {
  const output = response.output.map((item) => {
    if (item.type === "function_call") {
      return {
        ...item,
        parsed_arguments: parseToolCall2(params, item)
      };
    }
    if (item.type === "message") {
      const content = item.content.map((content2) => {
        if (content2.type === "output_text") {
          return {
            ...content2,
            parsed: parseTextFormat(params, content2.text)
          };
        }
        return content2;
      });
      return {
        ...item,
        content
      };
    }
    return item;
  });
  const parsed = Object.assign({}, response, { output });
  if (!Object.getOwnPropertyDescriptor(response, "output_text")) {
    addOutputText(parsed);
  }
  Object.defineProperty(parsed, "output_parsed", {
    enumerable: true,
    get() {
      for (const output2 of parsed.output) {
        if (output2.type !== "message") {
          continue;
        }
        for (const content of output2.content) {
          if (content.type === "output_text" && content.parsed !== null) {
            return content.parsed;
          }
        }
      }
      return null;
    }
  });
  return parsed;
}
function parseTextFormat(params, content) {
  if (params.text?.format?.type !== "json_schema") {
    return null;
  }
  if ("$parseRaw" in params.text?.format) {
    const text_format = params.text?.format;
    return text_format.$parseRaw(content);
  }
  return JSON.parse(content);
}
function hasAutoParseableInput2(params) {
  if (isAutoParsableResponseFormat(params.text?.format)) {
    return true;
  }
  return false;
}
function isAutoParsableTool2(tool) {
  return tool?.["$brand"] === "auto-parseable-tool";
}
function getInputToolByName(input_tools, name) {
  return input_tools.find((tool) => tool.type === "function" && tool.name === name);
}
function parseToolCall2(params, toolCall) {
  const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
  return {
    ...toolCall,
    ...toolCall,
    parsed_arguments: isAutoParsableTool2(inputTool) ? inputTool.$parseRaw(toolCall.arguments) : inputTool?.strict ? JSON.parse(toolCall.arguments) : null
  };
}
function addOutputText(rsp) {
  const texts = [];
  for (const output of rsp.output) {
    if (output.type !== "message") {
      continue;
    }
    for (const content of output.content) {
      if (content.type === "output_text") {
        texts.push(content.text);
      }
    }
  }
  rsp.output_text = texts.join("");
}

// node_modules/openai/lib/responses/ResponseStream.mjs
var _ResponseStream_instances;
var _ResponseStream_params;
var _ResponseStream_currentResponseSnapshot;
var _ResponseStream_finalResponse;
var _ResponseStream_beginRequest;
var _ResponseStream_addEvent;
var _ResponseStream_endRequest;
var _ResponseStream_accumulateResponse;
var ResponseStream = class _ResponseStream extends EventStream {
  constructor(params) {
    super();
    _ResponseStream_instances.add(this);
    _ResponseStream_params.set(this, void 0);
    _ResponseStream_currentResponseSnapshot.set(this, void 0);
    _ResponseStream_finalResponse.set(this, void 0);
    __classPrivateFieldSet(this, _ResponseStream_params, params, "f");
  }
  static createResponse(client, params, options) {
    const runner = new _ResponseStream(params);
    runner._run(() => runner._createOrRetrieveResponse(client, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createOrRetrieveResponse(client, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
    let stream;
    let starting_after = null;
    if ("response_id" in params) {
      stream = await client.responses.retrieve(params.response_id, { stream: true }, { ...options, signal: this.controller.signal, stream: true });
      starting_after = params.starting_after ?? null;
    } else {
      stream = await client.responses.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    }
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
  }
  [(_ResponseStream_params = /* @__PURE__ */ new WeakMap(), _ResponseStream_currentResponseSnapshot = /* @__PURE__ */ new WeakMap(), _ResponseStream_finalResponse = /* @__PURE__ */ new WeakMap(), _ResponseStream_instances = /* @__PURE__ */ new WeakSet(), _ResponseStream_beginRequest = function _ResponseStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
  }, _ResponseStream_addEvent = function _ResponseStream_addEvent2(event, starting_after) {
    if (this.ended)
      return;
    const maybeEmit = (name, event2) => {
      if (starting_after == null || event2.sequence_number > starting_after) {
        this._emit(name, event2);
      }
    };
    const response = __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_accumulateResponse).call(this, event);
    maybeEmit("event", event);
    switch (event.type) {
      case "response.output_text.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          maybeEmit("response.output_text.delta", {
            ...event,
            snapshot: content.text
          });
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          maybeEmit("response.function_call_arguments.delta", {
            ...event,
            snapshot: output.arguments
          });
        }
        break;
      }
      default:
        maybeEmit(event.type, event);
        break;
    }
  }, _ResponseStream_endRequest = function _ResponseStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any events`);
    }
    __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
    const parsedResponse = finalizeResponse(snapshot, __classPrivateFieldGet(this, _ResponseStream_params, "f"));
    __classPrivateFieldSet(this, _ResponseStream_finalResponse, parsedResponse, "f");
    return parsedResponse;
  }, _ResponseStream_accumulateResponse = function _ResponseStream_accumulateResponse2(event) {
    let snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      if (event.type !== "response.created") {
        throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
      }
      snapshot = __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
      return snapshot;
    }
    switch (event.type) {
      case "response.output_item.added": {
        snapshot.output.push(event.item);
        break;
      }
      case "response.content_part.added": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        const type = output.type;
        const part = event.part;
        if (type === "message" && part.type !== "reasoning_text") {
          output.content.push(part);
        } else if (type === "reasoning" && part.type === "reasoning_text") {
          if (!output.content) {
            output.content = [];
          }
          output.content.push(part);
        }
        break;
      }
      case "response.output_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          output.arguments += event.delta;
        }
        break;
      }
      case "response.reasoning_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "reasoning") {
          const content = output.content?.[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "reasoning_text") {
            throw new OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.completed": {
        __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
        break;
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((event2) => event2 ? { value: event2, done: false } : { value: void 0, done: true });
        }
        const event = pushQueue.shift();
        return { value: event, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  /**
   * @returns a promise that resolves with the final Response, or rejects
   * if an error occurred or the stream ended prematurely without producing a REsponse.
   */
  async finalResponse() {
    await this.done();
    const response = __classPrivateFieldGet(this, _ResponseStream_finalResponse, "f");
    if (!response)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return response;
  }
};
function finalizeResponse(snapshot, params) {
  return maybeParseResponse(snapshot, params);
}

// node_modules/openai/resources/responses/input-items.mjs
var InputItems = class extends APIResource {
  /**
   * Returns a list of input items for a given response.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const responseItem of client.responses.inputItems.list(
   *   'response_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(responseID, query = {}, options) {
    return this._client.getAPIList(path2`/responses/${responseID}/input_items`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/responses/responses.mjs
var Responses = class extends APIResource {
  constructor() {
    super(...arguments);
    this.inputItems = new InputItems(this._client);
  }
  create(body, options) {
    return this._client.post("/responses", { body, ...options, stream: body.stream ?? false })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  retrieve(responseID, query = {}, options) {
    return this._client.get(path2`/responses/${responseID}`, {
      query,
      ...options,
      stream: query?.stream ?? false
    })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  /**
   * Deletes a model response with the given ID.
   *
   * @example
   * ```ts
   * await client.responses.delete(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  delete(responseID, options) {
    return this._client.delete(path2`/responses/${responseID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
  parse(body, options) {
    return this._client.responses.create(body, options)._thenUnwrap((response) => parseResponse(response, body));
  }
  /**
   * Creates a model response stream
   */
  stream(body, options) {
    return ResponseStream.createResponse(this._client, body, options);
  }
  /**
   * Cancels a model response with the given ID. Only responses created with the
   * `background` parameter set to `true` can be cancelled.
   * [Learn more](https://platform.openai.com/docs/guides/background).
   *
   * @example
   * ```ts
   * const response = await client.responses.cancel(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  cancel(responseID, options) {
    return this._client.post(path2`/responses/${responseID}/cancel`, options);
  }
};
Responses.InputItems = InputItems;

// node_modules/openai/resources/uploads/parts.mjs
var Parts = class extends APIResource {
  /**
   * Adds a
   * [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
   * A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
   * maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended
   * order of the Parts when you
   * [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
   */
  create(uploadID, body, options) {
    return this._client.post(path2`/uploads/${uploadID}/parts`, multipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/openai/resources/uploads/uploads.mjs
var Uploads = class extends APIResource {
  constructor() {
    super(...arguments);
    this.parts = new Parts(this._client);
  }
  /**
   * Creates an intermediate
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
   * that you can add
   * [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an hour
   * after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * contains all the parts you uploaded. This File is usable in the rest of our
   * platform as a regular File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified. Please
   * refer to documentation for the
   * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please follow
   * the documentation on
   * [creating a File](https://platform.openai.com/docs/api-reference/files/create).
   */
  create(body, options) {
    return this._client.post("/uploads", { body, ...options });
  }
  /**
   * Cancels the Upload. No Parts may be added after an Upload is cancelled.
   */
  cancel(uploadID, options) {
    return this._client.post(path2`/uploads/${uploadID}/cancel`, options);
  }
  /**
   * Completes the
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * is ready to use in the rest of the platform.
   *
   * You can specify the order of the Parts by passing in an ordered list of the Part
   * IDs.
   *
   * The number of bytes uploaded upon completion must match the number of bytes
   * initially specified when creating the Upload object. No Parts may be added after
   * an Upload is completed.
   */
  complete(uploadID, body, options) {
    return this._client.post(path2`/uploads/${uploadID}/complete`, { body, ...options });
  }
};
Uploads.Parts = Parts;

// node_modules/openai/lib/Util.mjs
var allSettledWithThrow = async (promises) => {
  const results = await Promise.allSettled(promises);
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length) {
    for (const result of rejected) {
      console.error(result.reason);
    }
    throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
  }
  const values = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    }
  }
  return values;
};

// node_modules/openai/resources/vector-stores/file-batches.mjs
var FileBatches = class extends APIResource {
  /**
   * Create a vector store file batch.
   */
  create(vectorStoreID, body, options) {
    return this._client.post(path2`/vector_stores/${vectorStoreID}/file_batches`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store file batch.
   */
  retrieve(batchID, params, options) {
    const { vector_store_id } = params;
    return this._client.get(path2`/vector_stores/${vector_store_id}/file_batches/${batchID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Cancel a vector store file batch. This attempts to cancel the processing of
   * files in this batch as soon as possible.
   */
  cancel(batchID, params, options) {
    const { vector_store_id } = params;
    return this._client.post(path2`/vector_stores/${vector_store_id}/file_batches/${batchID}/cancel`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Create a vector store batch and poll until all files have been processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const batch = await this.create(vectorStoreId, body);
    return await this.poll(vectorStoreId, batch.id, options);
  }
  /**
   * Returns a list of vector store files in a batch.
   */
  listFiles(batchID, params, options) {
    const { vector_store_id, ...query } = params;
    return this._client.getAPIList(path2`/vector_stores/${vector_store_id}/file_batches/${batchID}/files`, CursorPage, { query, ...options, headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]) });
  }
  /**
   * Wait for the given file batch to be processed.
   *
   * Note: this will return even if one of the files failed to process, you need to
   * check batch.file_counts.failed_count to handle this case.
   */
  async poll(vectorStoreID, batchID, options) {
    const headers = buildHeaders([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const { data: batch, response } = await this.retrieve(batchID, { vector_store_id: vectorStoreID }, {
        ...options,
        headers
      }).withResponse();
      switch (batch.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "failed":
        case "cancelled":
        case "completed":
          return batch;
      }
    }
  }
  /**
   * Uploads the given files concurrently and then creates a vector store file batch.
   *
   * The concurrency limit is configurable using the `maxConcurrency` parameter.
   */
  async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
    if (files == null || files.length == 0) {
      throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
    }
    const configuredConcurrency = options?.maxConcurrency ?? 5;
    const concurrencyLimit = Math.min(configuredConcurrency, files.length);
    const client = this._client;
    const fileIterator = files.values();
    const allFileIds = [...fileIds];
    async function processFiles(iterator) {
      for (let item of iterator) {
        const fileObj = await client.files.create({ file: item, purpose: "assistants" }, options);
        allFileIds.push(fileObj.id);
      }
    }
    const workers = Array(concurrencyLimit).fill(fileIterator).map(processFiles);
    await allSettledWithThrow(workers);
    return await this.createAndPoll(vectorStoreId, {
      file_ids: allFileIds
    });
  }
};

// node_modules/openai/resources/vector-stores/files.mjs
var Files3 = class extends APIResource {
  /**
   * Create a vector store file by attaching a
   * [File](https://platform.openai.com/docs/api-reference/files) to a
   * [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
   */
  create(vectorStoreID, body, options) {
    return this._client.post(path2`/vector_stores/${vectorStoreID}/files`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store file.
   */
  retrieve(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.get(path2`/vector_stores/${vector_store_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Update attributes on a vector store file.
   */
  update(fileID, params, options) {
    const { vector_store_id, ...body } = params;
    return this._client.post(path2`/vector_stores/${vector_store_id}/files/${fileID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of vector store files.
   */
  list(vectorStoreID, query = {}, options) {
    return this._client.getAPIList(path2`/vector_stores/${vectorStoreID}/files`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a vector store file. This will remove the file from the vector store but
   * the file itself will not be deleted. To delete the file, use the
   * [delete file](https://platform.openai.com/docs/api-reference/files/delete)
   * endpoint.
   */
  delete(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.delete(path2`/vector_stores/${vector_store_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Attach a file to the given vector store and wait for it to be processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const file = await this.create(vectorStoreId, body, options);
    return await this.poll(vectorStoreId, file.id, options);
  }
  /**
   * Wait for the vector store file to finish processing.
   *
   * Note: this will return even if the file failed to process, you need to check
   * file.last_error and file.status to handle these cases
   */
  async poll(vectorStoreID, fileID, options) {
    const headers = buildHeaders([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const fileResponse = await this.retrieve(fileID, {
        vector_store_id: vectorStoreID
      }, { ...options, headers }).withResponse();
      const file = fileResponse.data;
      switch (file.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = fileResponse.response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "failed":
        case "completed":
          return file;
      }
    }
  }
  /**
   * Upload a file to the `files` API and then attach it to the given vector store.
   *
   * Note the file will be asynchronously processed (you can use the alternative
   * polling helper method to wait for processing to complete).
   */
  async upload(vectorStoreId, file, options) {
    const fileInfo = await this._client.files.create({ file, purpose: "assistants" }, options);
    return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
  }
  /**
   * Add a file to a vector store and poll until processing is complete.
   */
  async uploadAndPoll(vectorStoreId, file, options) {
    const fileInfo = await this.upload(vectorStoreId, file, options);
    return await this.poll(vectorStoreId, fileInfo.id, options);
  }
  /**
   * Retrieve the parsed contents of a vector store file.
   */
  content(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.getAPIList(path2`/vector_stores/${vector_store_id}/files/${fileID}/content`, Page, { ...options, headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]) });
  }
};

// node_modules/openai/resources/vector-stores/vector-stores.mjs
var VectorStores = class extends APIResource {
  constructor() {
    super(...arguments);
    this.files = new Files3(this._client);
    this.fileBatches = new FileBatches(this._client);
  }
  /**
   * Create a vector store.
   */
  create(body, options) {
    return this._client.post("/vector_stores", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store.
   */
  retrieve(vectorStoreID, options) {
    return this._client.get(path2`/vector_stores/${vectorStoreID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a vector store.
   */
  update(vectorStoreID, body, options) {
    return this._client.post(path2`/vector_stores/${vectorStoreID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of vector stores.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/vector_stores", CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a vector store.
   */
  delete(vectorStoreID, options) {
    return this._client.delete(path2`/vector_stores/${vectorStoreID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Search a vector store for relevant chunks based on a query and file attributes
   * filter.
   */
  search(vectorStoreID, body, options) {
    return this._client.getAPIList(path2`/vector_stores/${vectorStoreID}/search`, Page, {
      body,
      method: "post",
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};
VectorStores.Files = Files3;
VectorStores.FileBatches = FileBatches;

// node_modules/openai/resources/webhooks.mjs
var _Webhooks_instances;
var _Webhooks_validateSecret;
var _Webhooks_getRequiredHeader;
var Webhooks = class extends APIResource {
  constructor() {
    super(...arguments);
    _Webhooks_instances.add(this);
  }
  /**
   * Validates that the given payload was sent by OpenAI and parses the payload.
   */
  async unwrap(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
    await this.verifySignature(payload, headers, secret, tolerance);
    return JSON.parse(payload);
  }
  /**
   * Validates whether or not the webhook payload was sent by OpenAI.
   *
   * An error will be raised if the webhook payload was not sent by OpenAI.
   *
   * @param payload - The webhook payload
   * @param headers - The webhook headers
   * @param secret - The webhook secret (optional, will use client secret if not provided)
   * @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
   */
  async verifySignature(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
    if (typeof crypto === "undefined" || typeof crypto.subtle.importKey !== "function" || typeof crypto.subtle.verify !== "function") {
      throw new Error("Webhook signature verification is only supported when the `crypto` global is defined");
    }
    __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_validateSecret).call(this, secret);
    const headersObj = buildHeaders([headers]).values;
    const signatureHeader = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-signature");
    const timestamp = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-timestamp");
    const webhookId = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-id");
    const timestampSeconds = parseInt(timestamp, 10);
    if (isNaN(timestampSeconds)) {
      throw new InvalidWebhookSignatureError("Invalid webhook timestamp format");
    }
    const nowSeconds = Math.floor(Date.now() / 1e3);
    if (nowSeconds - timestampSeconds > tolerance) {
      throw new InvalidWebhookSignatureError("Webhook timestamp is too old");
    }
    if (timestampSeconds > nowSeconds + tolerance) {
      throw new InvalidWebhookSignatureError("Webhook timestamp is too new");
    }
    const signatures = signatureHeader.split(" ").map((part) => part.startsWith("v1,") ? part.substring(3) : part);
    const decodedSecret = secret.startsWith("whsec_") ? Buffer.from(secret.replace("whsec_", ""), "base64") : Buffer.from(secret, "utf-8");
    const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey("raw", decodedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    for (const signature of signatures) {
      try {
        const signatureBytes = Buffer.from(signature, "base64");
        const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(signedPayload));
        if (isValid) {
          return;
        }
      } catch {
        continue;
      }
    }
    throw new InvalidWebhookSignatureError("The given webhook signature does not match the expected signature");
  }
};
_Webhooks_instances = /* @__PURE__ */ new WeakSet(), _Webhooks_validateSecret = function _Webhooks_validateSecret2(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error(`The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function`);
  }
}, _Webhooks_getRequiredHeader = function _Webhooks_getRequiredHeader2(headers, name) {
  if (!headers) {
    throw new Error(`Headers are required`);
  }
  const value = headers.get(name);
  if (value === null || value === void 0) {
    throw new Error(`Missing required header: ${name}`);
  }
  return value;
};

// node_modules/openai/client.mjs
var _OpenAI_instances;
var _a2;
var _OpenAI_encoder;
var _OpenAI_baseURLOverridden;
var OpenAI = class {
  /**
   * API Client for interfacing with the OpenAI API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
   * @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("OPENAI_API_KEY"), organization = readEnv("OPENAI_ORG_ID") ?? null, project = readEnv("OPENAI_PROJECT_ID") ?? null, webhookSecret = readEnv("OPENAI_WEBHOOK_SECRET") ?? null, ...opts } = {}) {
    _OpenAI_instances.add(this);
    _OpenAI_encoder.set(this, void 0);
    this.completions = new Completions2(this);
    this.chat = new Chat(this);
    this.embeddings = new Embeddings(this);
    this.files = new Files2(this);
    this.images = new Images(this);
    this.audio = new Audio(this);
    this.moderations = new Moderations(this);
    this.models = new Models(this);
    this.fineTuning = new FineTuning(this);
    this.graders = new Graders2(this);
    this.vectorStores = new VectorStores(this);
    this.webhooks = new Webhooks(this);
    this.beta = new Beta(this);
    this.batches = new Batches(this);
    this.uploads = new Uploads(this);
    this.responses = new Responses(this);
    this.realtime = new Realtime2(this);
    this.conversations = new Conversations(this);
    this.evals = new Evals(this);
    this.containers = new Containers(this);
    if (apiKey === void 0) {
      throw new OpenAIError("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
    }
    const options = {
      apiKey,
      organization,
      project,
      webhookSecret,
      ...opts,
      baseURL: baseURL || `https://api.openai.com/v1`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
    }
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a2.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _OpenAI_encoder, FallbackEncoder, "f");
    this._options = options;
    this.apiKey = typeof apiKey === "string" ? apiKey : "Missing Key";
    this.organization = organization;
    this.project = project;
    this.webhookSecret = webhookSecret;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      organization: this.organization,
      project: this.project,
      webhookSecret: this.webhookSecret,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    return;
  }
  async authHeaders(opts) {
    return buildHeaders([{ Authorization: `Bearer ${this.apiKey}` }]);
  }
  stringifyQuery(query) {
    return stringify(query, { arrayFormat: "brackets" });
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  async _callApiKey() {
    const apiKey = this._options.apiKey;
    if (typeof apiKey !== "function")
      return false;
    let token;
    try {
      token = await apiKey();
    } catch (err) {
      if (err instanceof OpenAIError)
        throw err;
      throw new OpenAIError(
        `Failed to get token from 'apiKey' function: ${err.message}`,
        // @ts-ignore
        { cause: err }
      );
    }
    if (typeof token !== "string" || !token) {
      throw new OpenAIError(`Expected 'apiKey' function argument to return a string but it returned ${token}`);
    }
    this.apiKey = token;
    return true;
  }
  buildURL(path5, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet(this, _OpenAI_instances, "m", _OpenAI_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path5) ? new URL(path5) : new URL(baseURL + (baseURL.endsWith("/") && path5.startsWith("/") ? path5.slice(1) : path5));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
    await this._callApiKey();
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path5, opts) {
    return this.methodRequest("get", path5, opts);
  }
  post(path5, opts) {
    return this.methodRequest("post", path5, opts);
  }
  patch(path5, opts) {
    return this.methodRequest("patch", path5, opts);
  }
  put(path5, opts) {
    return this.methodRequest("put", path5, opts);
  }
  delete(path5, opts) {
    return this.methodRequest("delete", path5, opts);
  }
  methodRequest(method, path5, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path5, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const specialHeaders = [...response.headers.entries()].filter(([name]) => name === "x-request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("");
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  getAPIList(path5, Page2, opts) {
    return this.requestAPIList(Page2, { method: "get", path: path5, ...opts });
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null, void 0);
    return new PagePromise(this, request, Page2);
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path5, query, defaultBaseURL } = options;
    const url = this.buildURL(path5, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders(),
        "OpenAI-Organization": this.organization,
        "OpenAI-Project": this.project
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom(body) };
    } else {
      return __classPrivateFieldGet(this, _OpenAI_encoder, "f").call(this, { body, headers });
    }
  }
};
_a2 = OpenAI, _OpenAI_encoder = /* @__PURE__ */ new WeakMap(), _OpenAI_instances = /* @__PURE__ */ new WeakSet(), _OpenAI_baseURLOverridden = function _OpenAI_baseURLOverridden2() {
  return this.baseURL !== "https://api.openai.com/v1";
};
OpenAI.OpenAI = _a2;
OpenAI.DEFAULT_TIMEOUT = 6e5;
OpenAI.OpenAIError = OpenAIError;
OpenAI.APIError = APIError;
OpenAI.APIConnectionError = APIConnectionError;
OpenAI.APIConnectionTimeoutError = APIConnectionTimeoutError;
OpenAI.APIUserAbortError = APIUserAbortError;
OpenAI.NotFoundError = NotFoundError;
OpenAI.ConflictError = ConflictError;
OpenAI.RateLimitError = RateLimitError;
OpenAI.BadRequestError = BadRequestError;
OpenAI.AuthenticationError = AuthenticationError;
OpenAI.InternalServerError = InternalServerError;
OpenAI.PermissionDeniedError = PermissionDeniedError;
OpenAI.UnprocessableEntityError = UnprocessableEntityError;
OpenAI.InvalidWebhookSignatureError = InvalidWebhookSignatureError;
OpenAI.toFile = toFile;
OpenAI.Completions = Completions2;
OpenAI.Chat = Chat;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files2;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.FineTuning = FineTuning;
OpenAI.Graders = Graders2;
OpenAI.VectorStores = VectorStores;
OpenAI.Webhooks = Webhooks;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.Uploads = Uploads;
OpenAI.Responses = Responses;
OpenAI.Realtime = Realtime2;
OpenAI.Conversations = Conversations;
OpenAI.Evals = Evals;
OpenAI.Containers = Containers;

// src/free-ai-engine.mjs
function generateFreeSmartResponse(userMessage, context = []) {
  const text = (userMessage || "").trim();
  if (!text) return "Halo! Saya VARIS AI. Ada yang ingin kamu tanyakan atau cari informasinya di internet?";
  const lower = text.toLowerCase().replace(/[?!.,;:]/g, " ").replace(/\s+/g, " ").trim();
  if ((lower.includes("orang") || lower.includes("penduduk") || lower.includes("populasi") || lower.includes("jiwa") || lower.includes("masyarakat")) && (lower.includes("indonesia") || lower.includes("negeri ini") || lower.includes("negara kita")) || lower.includes("berapa juta orang") || lower.includes("berapa orang di indonesia") || lower.includes("jumlah penduduk indonesia")) {
    return "Jumlah penduduk Indonesia saat ini diperkirakan mencapai sekitar **278 hingga 282 juta jiwa** (berdasarkan data resmi Badan Pusat Statistik / BPS dan Kementerian Dalam Negeri terbaru).";
  }
  if ((lower.includes("berapa provinsi") || lower.includes("jumlah provinsi") || lower.includes("ada berapa provinsi")) && lower.includes("indonesia")) {
    return "Indonesia saat ini memiliki **38 provinsi** (termasuk 4 provinsi baru hasil pemekaran di Papua: Papua Selatan, Papua Tengah, Papua Pegunungan, dan Papua Barat Daya).";
  }
  if ((lower.includes("berapa pulau") || lower.includes("jumlah pulau") || lower.includes("ada berapa pulau")) && lower.includes("indonesia")) {
    return "Indonesia memiliki lebih dari **17.000 pulau** (sekitar 17.508 pulau), dengan 5 pulau utama: Sumatra, Jawa, Kalimantan, Sulawesi, dan Papua.";
  }
  if ((lower.includes("mata uang") || lower.includes("uang resmi")) && lower.includes("indonesia")) {
    return "Mata uang resmi Indonesia adalah **Rupiah (IDR)**.";
  }
  if (lower.includes("lagu kebangsaan") && lower.includes("indonesia")) {
    return "Lagu kebangsaan Indonesia adalah **Indonesia Raya**, yang diciptakan oleh **W.R. Supratman**.";
  }
  if (lower.includes("gunung tertinggi") && lower.includes("indonesia")) {
    return "Gunung tertinggi di Indonesia adalah **Puncak Jaya (Carstensz Pyramid)** di Papua dengan ketinggian **4.884 mdpl**.";
  }
  if (lower.includes("danau terbesar") && lower.includes("indonesia")) {
    return "Danau terbesar di Indonesia adalah **Danau Toba** di Sumatera Utara.";
  }
  if (lower.includes("sungai terpanjang") && lower.includes("indonesia")) {
    return "Sungai terpanjang di Indonesia adalah **Sungai Kapuas** di Kalimantan Barat dengan panjang sekitar **1.143 km**.";
  }
  if (lower.includes("masjid") && (lower.includes("ibadah") || lower.includes("agama") || lower.includes("umat") || lower.includes("siapa") || lower.includes("apa"))) {
    return "Masjid adalah tempat ibadah umat **Islam (Muslim)**.";
  }
  if (lower.includes("gereja") && (lower.includes("ibadah") || lower.includes("agama") || lower.includes("umat") || lower.includes("siapa") || lower.includes("apa"))) {
    return "Gereja adalah tempat ibadah umat **Kristen (Protestan dan Katolik)**.";
  }
  if (lower.includes("pura") && (lower.includes("ibadah") || lower.includes("agama") || lower.includes("umat") || lower.includes("siapa") || lower.includes("apa"))) {
    return "Pura adalah tempat ibadah umat **Hindu**.";
  }
  if ((lower.includes("vihara") || lower.includes("wihara")) && (lower.includes("ibadah") || lower.includes("agama") || lower.includes("umat") || lower.includes("siapa") || lower.includes("apa"))) {
    return "Vihara adalah tempat ibadah umat **Buddha**.";
  }
  if ((lower.includes("klenteng") || lower.includes("kelenteng") || lower.includes("litang")) && (lower.includes("ibadah") || lower.includes("agama") || lower.includes("umat") || lower.includes("siapa") || lower.includes("apa"))) {
    return "Klenteng / Litang adalah tempat ibadah umat **Khonghucu**.";
  }
  if (lower.includes("sinagoge") || lower.includes("sinagoga")) {
    return "Sinagoge adalah tempat ibadah umat **Yahudi (Yudaisme)**.";
  }
  if ((lower.includes("kitab") || lower.includes("suci")) && (lower.includes("islam") || lower.includes("muslim") || lower.includes("al-quran") || lower.includes("alquran") || lower.includes("quran"))) {
    return "Kitab suci umat Islam adalah **Al-Qur'an**.";
  }
  if ((lower.includes("kitab") || lower.includes("suci")) && (lower.includes("kristen") || lower.includes("katolik") || lower.includes("protestan") || lower.includes("alkitab") || lower.includes("injil"))) {
    return "Kitab suci umat Kristen (Protestan dan Katolik) adalah **Alkitab**.";
  }
  if ((lower.includes("kitab") || lower.includes("suci")) && (lower.includes("hindu") || lower.includes("weda") || lower.includes("veda"))) {
    return "Kitab suci umat Hindu adalah **Weda (Veda)**.";
  }
  if ((lower.includes("kitab") || lower.includes("suci")) && (lower.includes("buddha") || lower.includes("tripitaka"))) {
    return "Kitab suci umat Buddha adalah **Tripitaka**.";
  }
  if ((lower.includes("kitab") || lower.includes("suci")) && (lower.includes("khonghucu") || lower.includes("si shu"))) {
    return "Kitab suci umat Khonghucu adalah **Si Shu Wu Jing**.";
  }
  if ((lower.includes("ai") || lower.includes("kecerdasan buatan") || lower.includes("artificial intelligence")) && (lower.includes("kapan") || lower.includes("sejarah") || lower.includes("diciptakan") || lower.includes("dibuat") || lower.includes("ditemukan") || lower.includes("pertama kali") || lower.includes("awal mula") || lower.includes("siapa penemu") || lower.includes("bapak ai"))) {
    if (lower.includes("bapak ai") || lower.includes("penemu ai") || lower.includes("siapa pencetus") || lower.includes("siapa penemu")) {
      return "**John McCarthy** dijuluki sebagai 'Bapak AI' karena beliaulah yang mencetuskan istilah *Artificial Intelligence* pada Konferensi Dartmouth tahun 1956. Selain itu, **Alan Turing** diakui secara luas sebagai pelopor utama konsep kecerdasan mesin lewat *Turing Test* (1950).";
    }
    return "Kecerdasan Buatan (AI) pertama kali dicetuskan secara resmi pada tahun **1956** dalam **Konferensi Dartmouth (*Dartmouth Summer Research Project on Artificial Intelligence*)** oleh **John McCarthy**, Marvin Minsky, Nathaniel Rochester, dan Claude Shannon.\n\nFondasi teoritisnya telah dirintis sebelumnya oleh **Alan Turing** pada tahun **1950** lewat makalah *'Computing Machinery and Intelligence'* yang memperkenalkan konsep **Turing Test**.";
  }
  if (lower.includes("turing test") || lower.includes("tes turing")) {
    return "**Turing Test** adalah tes yang digagas oleh **Alan Turing** pada tahun 1950 untuk menguji apakah suatu mesin atau kecerdasan buatan memiliki kemampuan berpikir dan berkomunikasi yang tidak dapat dibedakan dari manusia.";
  }
  if (lower.includes("komputer") && (lower.includes("penemu") || lower.includes("bapak") || lower.includes("diciptakan") || lower.includes("sejarah")) || lower.includes("siapa penemu komputer") || lower.includes("penemu komputer pertama")) {
    return "**Charles Babbage** dikenal sebagai 'Bapak Komputer' karena merancang *Difference Engine* dan *Analytical Engine* (konsep komputer mekanik pertama) pada abad ke-19. Sementara programmer pertama di dunia adalah **Ada Lovelace**.";
  }
  if (lower.includes("internet") && (lower.includes("kapan") || lower.includes("sejarah") || lower.includes("diciptakan") || lower.includes("dimulai") || lower.includes("penemu")) || lower.includes("sejarah internet") || lower.includes("kapan internet diciptakan")) {
    return "Internet berawal pada tahun **1969** melalui proyek **ARPANET** (*Advanced Research Projects Agency Network*) oleh Departemen Pertahanan AS. Protokol TCP/IP distandarisasi pada tahun **1983**, dan **World Wide Web (WWW)** diciptakan oleh **Tim Berners-Lee** pada tahun **1989**.";
  }
  if (lower.includes("www") || lower.includes("world wide web") || lower.includes("penemu web")) {
    return "World Wide Web (WWW) diciptakan oleh ilmuwan komputer asal Inggris, **Sir Tim Berners-Lee**, pada tahun **1989** di CERN.";
  }
  if (lower.includes("pendiri google") || lower.includes("siapa yang mendirikan google") || lower.includes("pembuat google")) {
    return "Google didirikan oleh **Larry Page** dan **Sergey Brin** pada September 1998 saat mereka menempuh studi doktoral di Universitas Stanford.";
  }
  if (lower.includes("pendiri microsoft") || lower.includes("pembuat microsoft")) {
    return "Microsoft didirikan oleh **Bill Gates** dan **Paul Allen** pada 4 April 1975.";
  }
  if (lower.includes("pendiri apple") || lower.includes("pembuat apple")) {
    return "Apple didirikan oleh **Steve Jobs**, **Steve Wozniak**, dan **Ronald Wayne** pada 1 April 1976.";
  }
  if (lower.includes("pendiri openai") || lower.includes("pendiri open ai") || lower.includes("pembuat chatgpt")) {
    return "OpenAI didirikan pada Desember 2015 oleh **Sam Altman**, **Elon Musk**, **Greg Brockman**, **Ilya Sutskever**, Wojciech Zaremba, dan John Schulman.";
  }
  if (lower.includes("pendiri meta") || lower.includes("pendiri facebook")) {
    return "Facebook (kini Meta) didirikan oleh **Mark Zuckerberg** bersama teman sekamarnya (Eduardo Saverin, Andrew McCollum, Dustin Moskovitz, dan Chris Hughes) pada tahun 2004.";
  }
  if (lower.includes("kecepatan cahaya") || lower.includes("berapa kecepatan cahaya")) {
    return "Kecepatan cahaya di ruang hampa adalah **299.792.458 meter per detik** (atau sekitar **300.000 km/detik**).";
  }
  if (lower.includes("jarak bumi ke matahari") || lower.includes("jarak bumi dan matahari") || lower.includes("jarak matahari ke bumi")) {
    return "Jarak rata-rata Bumi ke Matahari adalah sekitar **149,6 juta kilometer** (setara dengan 1 Satuan Astronomi / 1 AU).";
  }
  if (lower.includes("planet terbesar") && (lower.includes("tata surya") || lower.includes("semesta") || lower.includes("kita"))) {
    return "Planet terbesar di Tata Surya adalah **Jupiter**, dengan diameter sekitar 142.984 km (lebih dari 11 kali ukuran diameter Bumi).";
  }
  if (lower.includes("planet terkecil") && (lower.includes("tata surya") || lower.includes("kita"))) {
    return "Planet terkecil di Tata Surya adalah **Merkurius**.";
  }
  if (lower.includes("planet terdekat ke matahari") || lower.includes("planet terdekat dari matahari")) {
    return "Planet terdekat dari Matahari adalah **Merkurius** (jarak rata-rata ~57,9 juta km).";
  }
  if (lower.includes("planet bercincin") || lower.includes("planet yang punya cincin")) {
    return "Planet dengan sistem cincin paling spektakuler dan terkenal adalah **Saturnus** (meskipun Jupiter, Uranus, dan Neptunus juga memiliki cincin tipis).";
  }
  if (lower.includes("gravitasi") && (lower.includes("penemu") || lower.includes("hukum") || lower.includes("siapa"))) {
    return "Hukum Gravitasi Universal dirumuskan oleh **Sir Isaac Newton** pada tahun 1687, dan kemudian disempurnakan oleh Teori Relativitas Umum karya **Albert Einstein** pada tahun 1915.";
  }
  if (lower.includes("struktur dna") || lower.includes("penemu dna") || lower.includes("heliks ganda")) {
    return "Struktur heliks ganda (*double helix*) DNA ditemukan oleh **James Watson** dan **Francis Crick** pada tahun 1953, didukung oleh data penting difraksi sinar-X dari **Rosalind Franklin**.";
  }
  if (lower.includes("unsur paling banyak di alam semesta") || lower.includes("unsur terbanyak di alam semesta")) {
    return "Unsur paling melimpah di alam semesta adalah **Hidrogen (H)** (sekitar 75% massa unsur alam semesta), diikuti oleh **Helium (He)** (sekitar 24%).";
  }
  if (lower.includes("gas terbanyak di atmosfer") || lower.includes("gas paling banyak di atmosfer") || lower.includes("unsur terbanyak di atmosfer")) {
    return "Gas paling banyak di atmosfer Bumi adalah **Nitrogen ($N_2$)** (~78%), diikuti oleh **Oksigen ($O_2$)** (~21%) dan Argon (~0,93%).";
  }
  if (lower.includes("gunung tertinggi di dunia") || lower.includes("gunung paling tinggi di dunia")) {
    return "Gunung tertinggi di dunia di atas permukaan laut adalah **Gunung Everest** di Pegunungan Himalaya (perbatasan Nepal dan Tibet) dengan ketinggian **8.848,86 meter**.";
  }
  if (lower.includes("sungai terpanjang di dunia") || lower.includes("sungai paling panjang di dunia")) {
    return "Sungai terpanjang di dunia adalah **Sungai Nil** di Afrika (panjang ~6.650 km), dengan pesaing utama **Sungai Amazon** di Amerika Selatan (~6.400 km).";
  }
  if (lower.includes("samudra terbesar") || lower.includes("laut terbesar")) {
    return "Samudra terbesar di dunia adalah **Samudra Pasifik**, yang menutupi lebih dari 30% total luas permukaan Bumi.";
  }
  if (lower.includes("negara terluas di dunia") || lower.includes("negara terbesar di dunia")) {
    return "Negara dengan wilayah terluas di dunia adalah **Rusia**, dengan luas sekitar 17,1 juta kilometer persegi.";
  }
  if (lower.includes("negara penduduk terbanyak") || lower.includes("negara dengan populasi terbanyak") || lower.includes("negara terpadat")) {
    return "Negara dengan jumlah penduduk terbanyak di dunia saat ini adalah **India** (sekitar 1,43 miliar jiwa), melampaui **Tiongkok (China)**.";
  }
  if (lower.includes("perang dunia 1") || lower.includes("perang dunia i") || lower.includes("perang dunia pertama")) {
    return "Perang Dunia I berlangsung dari **28 Juli 1914 hingga 11 November 1918**.";
  }
  if (lower.includes("perang dunia 2") || lower.includes("perang dunia ii") || lower.includes("perang dunia kedua")) {
    return "Perang Dunia II berlangsung dari **1 September 1939 hingga 2 September 1945**.";
  }
  if ((lower.includes("pbb") || lower.includes("perserikatan bangsa-bangsa") || lower.includes("united nations")) && (lower.includes("kapan") || lower.includes("berdiri") || lower.includes("didirikan") || lower.includes("sejarah"))) {
    return "Perserikatan Bangsa-Bangsa (PBB) didirikan pada **24 Oktober 1945** setelah berakhirnya Perang Dunia II untuk memelihara perdamaian dan keamanan internasional.";
  }
  if (lower.includes("mendarat di bulan") || lower.includes("manusia pertama di bulan") || lower.includes("orang pertama di bulan")) {
    return "Manusia pertama yang mendarat dan berjalan di Bulan adalah astronaut AS **Neil Armstrong** (misi Apollo 11) pada tanggal **20 Juli 1969**.";
  }
  if (lower.includes("apa itu inflasi") || lower.includes("pengertian inflasi")) {
    return "**Inflasi** adalah kenaikan harga barang dan jasa secara umum dan terus-menerus dalam jangka waktu tertentu, yang menyebabkan penurunan nilai atau daya beli mata uang.";
  }
  if (lower.includes("apa itu algoritma") || lower.includes("pengertian algoritma")) {
    return "**Algoritma** adalah urutan langkah-langkah logis dan sistematis yang terdefinisi dengan jelas untuk memecahkan suatu masalah atau menyelesaikan suatu instruksi komputasi.";
  }
  if (lower.includes("apa itu machine learning") || lower.includes("pengertian machine learning")) {
    return "**Machine Learning (ML)** adalah cabang dari kecerdasan buatan (AI) yang memungkinkan sistem komputer untuk belajar dan meningkatkan kinerjanya secara otomatis dari data tanpa harus diprogram secara eksplisit.";
  }
  if (lower.includes("apa itu deep learning") || lower.includes("pengertian deep learning")) {
    return "**Deep Learning** adalah bagian dari Machine Learning yang menggunakan jaringan saraf tiruan berlapis banyak (*deep neural networks*) untuk memproses data kompleks seperti citra gambar, suara, dan teks bahasa alami.";
  }
  if (lower.includes("apa itu blockchain") || lower.includes("pengertian blockchain")) {
    return "**Blockchain** adalah teknologi buku besar terdistribusi (*distributed ledger*) yang mencatat transaksi secara terdesentralisasi, aman, transparan, dan tidak dapat diubah (*immutable*).";
  }
  const mathResult = tryEvaluateMath(text);
  if (mathResult !== null) {
    return mathResult;
  }
  const webResearchContext = extractWebResearchFromContext(context);
  if (webResearchContext && webResearchContext.snippets.length > 0) {
    const synthesizedAnswer = synthesizeWebResearch(text, lower, webResearchContext);
    if (synthesizedAnswer) {
      return synthesizedAnswer;
    }
  }
  if (lower.includes("agama") && (lower.includes("indonesia") || lower.includes("ada apa saja") || lower.includes("apa saja")) || lower.includes("agama di indonesia") || lower.includes("agama resmi indonesia")) {
    return `Di Indonesia, terdapat **6 agama yang diakui secara resmi** oleh pemerintah:

1. **Islam** (Tempat Ibadah: Masjid, Kitab: Al-Qur'an)
2. **Kristen Protestan** (Tempat Ibadah: Gereja, Kitab: Alkitab)
3. **Kristen Katolik** (Tempat Ibadah: Gereja Katolik / Katedral, Kitab: Alkitab)
4. **Hindu** (Tempat Ibadah: Pura, Kitab: Weda)
5. **Buddha** (Tempat Ibadah: Vihara, Kitab: Tripitaka)
6. **Khonghucu** (Tempat Ibadah: Klenteng / Litang, Kitab: Si Shu Wu Jing)

Selain itu, Indonesia juga melindungi penganut **Aliran Kepercayaan terhadap Tuhan Yang Maha Esa**.`;
  }
  if ((lower.includes("programmer") || lower.includes("developer") || lower.includes("coder")) && (lower.includes("ai") || lower.includes("menggunakan ai") || lower.includes("pakai ai"))) {
    return `Alasan utama programmer menggunakan AI:

1. **Meningkatkan Produktivitas**: Membantu menulis kode boilerplate dan fungsi umum dengan cepat.
2. **Mempercepat Debugging**: Menganalisis pesan error dan memberikan rekomendasi solusi.
3. **Belajar Lebih Cepat**: Memahami sintaks atau framework baru secara instan.
4. **Refactoring & Optimasi**: Memberikan saran perbaikan kode agar lebih rapi dan aman.
5. **Otomasi Pengujian**: Membantu membuat unit test dan dokumentasi kode secara terstruktur.`;
  }
  if (lower.includes("jam berapa") || lower.includes("pukul berapa") || lower.includes("waktu sekarang") || lower.includes("sekarang jam")) {
    const now = /* @__PURE__ */ new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `Sekarang pukul **${timeStr} WIB**.`;
  }
  if (lower.includes("hari apa") || lower.includes("tanggal berapa") || lower.includes("hari ini hari")) {
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return `Hari ini adalah **${dateStr}**.`;
  }
  if (lower.includes("bahasa indonesia") || lower.includes("pake bahasa indonesia") || lower.includes("pakai bahasa indonesia") || lower.includes("gunakan bahasa indonesia")) {
    return "Tentu! Saya akan selalu merespons dalam Bahasa Indonesia yang singkat, padat, dan jelas.";
  }
  if (lower.includes("bahasa inggris") || lower.includes("speak english") || lower.includes("in english") || lower.includes("use english")) {
    return "Certainly! I will respond concisely in English.";
  }
  if (lower.includes("peran mu") || lower.includes("peran kamu") || lower.includes("apa peran") || lower.includes("tugas mu") || lower.includes("tugas kamu") || lower.includes("tugasmu") || lower.includes("peranmu") || lower.includes("fungsi kamu")) {
    if (lower.includes("robot")) {
      return "Peranku adalah asisten AI berbasis perangkat lunak digital (bukan robot fisik) untuk membantu menjawab pertanyaan, riset web, berhitung, dan coding.";
    }
    return "Saya **VARIS AI**, asisten cerdas yang bertugas menjawab pertanyaan, melakukan riset internet, berhitung, dan membantu pekerjaan Anda.";
  }
  if (lower.includes("apakah kamu robot") || lower.includes("sebagai robot") || lower.includes("kamu robot") || lower.includes("robot apa")) {
    return "Saya bukan robot fisik mekanik, melainkan asisten kecerdasan buatan (AI) berbasis software.";
  }
  if (lower.includes("belajar coding") || lower.includes("belajar pemrograman") || lower.includes("cara coding")) {
    return "Untuk mulai belajar coding: pilih bahasa pemula (seperti Python atau JavaScript), pelajari logika dasar (variabel, kondisi, loop, fungsi), dan langsung praktikkan dengan membuat proyek kecil.";
  }
  if (lower.includes("stres") || lower.includes("stress") || lower.includes("lelah") || lower.includes("capek")) {
    return "Cara meredakan stres: tarik napas dalam-dalam, istirahatkan mata sejenak dari layar, minum air putih, lakukan peregangan ringan, dan tidur yang cukup.";
  }
  if (/^(halo|hai|hey|hei|hello|hi|halo varis|hai varis)(\b|\s|$)/i.test(lower) || lower === "halo" || lower === "hai") {
    if (lower.includes("apa kabar") || lower.includes("gimana kabarmu") || lower.includes("kabarmu")) {
      return "Halo! Kabar saya sangat baik. Ada yang bisa saya bantu hari ini?";
    }
    return "Halo! Saya **VARIS AI**. Silakan ajukan pertanyaan yang ingin kamu ketahui.";
  }
  if (lower.includes("siapa kamu") || lower.includes("kamu siapa") || lower.includes("namamu siapa") || lower.includes("siapa namamu") || lower.includes("apa itu varis")) {
    return "Saya **VARIS AI**, asisten kecerdasan buatan yang siap membantu Anda mencari informasi akurat dari web dan menjawab berbagai pertanyaan secara singkat, padat, dan jelas.";
  }
  if (lower.includes("presiden sekarang") || lower.includes("presiden saat ini") || lower.includes("presiden indonesia")) {
    return "Presiden Republik Indonesia saat ini adalah **Prabowo Subianto**, didampingi oleh Wakil Presiden **Gibran Rakabuming Raka** (periode 2024\u20132029).";
  }
  if (lower.includes("presiden pertama")) {
    return "Presiden pertama Republik Indonesia adalah **Ir. Soekarno**, dengan wakil presiden **Drs. Mohammad Hatta**.";
  }
  if (lower.includes("ibukota indonesia") || lower.includes("ibu kota indonesia")) {
    return "Ibu kota Indonesia saat ini adalah **DKI Jakarta**, dengan **Ibu Kota Nusantara (IKN)** di Kalimantan Timur sebagai pusat pemerintahan baru yang sedang dipersiapkan.";
  }
  if (lower.includes("kemerdekaan indonesia") || lower.includes("indonesia merdeka")) {
    return "Indonesia merdeka pada hari **Jumat, 17 Agustus 1945** melalui proklamasi yang dibacakan oleh Ir. Soekarno didampingi Drs. Mohammad Hatta di Jakarta.";
  }
  if (lower.includes("kenapa langit biru") || lower.includes("mengapa langit biru") || lower.includes("langit berwarna biru")) {
    return "Langit berwarna biru akibat **Hamburan Rayleigh (*Rayleigh Scattering*)**, di mana partikel di atmosfer Bumi menghamburkan cahaya biru matahari yang bergelombang pendek jauh lebih kuat dibanding warna lainnya.";
  }
  if (lower.includes("black hole") || lower.includes("lubang hitam")) {
    return "**Lubang Hitam (*Black Hole*)** adalah wilayah luar angkasa dengan gravitasi sangat kuat sehingga tidak ada materi atau cahaya yang dapat keluar darinya, terbentuk dari runtuhnya bintang bermassa besar.";
  }
  if (lower.includes("fotosintesis")) {
    return "**Fotosintesis** adalah proses tumbuhan hijau mengubah air ($H_2O$) dan karbon dioksida ($CO_2$) menjadi energi (glukosa) dan oksigen ($O_2$) menggunakan bantuan cahaya matahari dan klorofil.";
  }
  if (lower.includes("apa itu ai") || lower.includes("kecerdasan buatan")) {
    return "**Kecerdasan Buatan (AI)** adalah teknologi komputer yang dirancang untuk meniru kemampuan berpikir manusia, seperti belajar, memproses bahasa, mengenali pola, dan memecahkan masalah.";
  }
  if (lower.includes("perbedaan php dan javascript") || lower.includes("php") && lower.includes("javascript")) {
    return "Perbedaan utama:\n\n\u2022 **PHP**: Berjalan di sisi server (*Backend*) untuk logika database dan rendering web.\n\u2022 **JavaScript**: Berjalan di browser (*Frontend*) untuk interaktivitas, dan juga bisa di backend (*Node.js*).";
  }
  if (lower.includes("perbedaan php dan python") || lower.includes("php") && lower.includes("python")) {
    return "Perbedaan utama:\n\n\u2022 **PHP**: Dikhususkan untuk pengembangan web backend dan API.\n\u2022 **Python**: Bahasa umum (*general-purpose*) yang dominan untuk AI, Machine Learning, Data Science, dan otomatisasi.";
  }
  const contextualAnswer = tryGenerateContextualAnswer(text, lower);
  if (contextualAnswer) {
    return contextualAnswer;
  }
  return `Mengenai pertanyaan Anda tentang **"${text}"**, silakan sampaikan aspek spesifik yang ingin Anda ketahui lebih lanjut agar saya dapat menjawabnya secara tepat.`;
}
function extractWebResearchFromContext(context = []) {
  if (!Array.isArray(context) || context.length === 0) return null;
  for (const item of context) {
    const content = item.content || "";
    if (content.includes("HASIL RISET WEB") || content.includes("REAL-TIME WEB RESEARCH") || content.includes("Title:")) {
      const snippets = [];
      const blocks = content.split(/SOURCE \d+:/i);
      for (const block of blocks) {
        const titleMatch = block.match(/Title:\s*(.+)/i);
        const contentMatch = block.match(/Content:\s*([\s\S]+?)(?=\n[A-Z][a-z]+:|\n\nSOURCE|\n\n\[Source|$)/i) || block.match(/Key Evidence:\s*([\s\S]+?)(?=\n\n|$)/i);
        if (titleMatch && contentMatch) {
          const title = titleMatch[1].trim();
          const cleanSnippet = contentMatch[1].replace(/^Domain:.*$/gmi, "").replace(/^Published:.*$/gmi, "").replace(/^URL:.*$/gmi, "").replace(/^Score:.*$/gmi, "").trim();
          if (cleanSnippet && cleanSnippet.length > 15) {
            snippets.push({ title, snippet: cleanSnippet });
          }
        }
      }
      if (snippets.length > 0) {
        return { raw: content, snippets };
      }
    }
  }
  return null;
}
function synthesizeWebResearch(query, lowerQuery, researchData) {
  const snippets = researchData.snippets || [];
  if (snippets.length === 0) return null;
  const isBrief = lowerQuery.includes("singkat") || lowerQuery.includes("padat") || lowerQuery.includes("jelas") || lowerQuery.includes("poin") || lowerQuery.includes("point") || lowerQuery.includes("to the point") || lowerQuery.includes("langsung") || lowerQuery.includes("tempat ibadah") || lowerQuery.includes("apa itu") || lowerQuery.includes("siapa");
  const queryTerms = lowerQuery.replace(/\b(jawab|dengan|singkat|padat|jelas|dan|yang|di|ke|dari|untuk|pada|adalah|apa|siapa|bagaimana|gimana|kenapa|mengapa|kapan|dimana|tolong|coba|sebutkan|ambil|poinnya|point|nya|tentang)\b/gi, " ").trim().split(/\s+/).filter((t) => t.length > 2);
  const scoredSentences = [];
  for (const s of snippets) {
    const cleanText = s.snippet.replace(/\[\d+\]/g, "").replace(/https?:\/\/\S+/g, "");
    const sentences = cleanText.split(/(?<=[.!?])\s+/);
    for (const sent of sentences) {
      const clean = sent.trim();
      if (clean.length > 15 && !scoredSentences.some((it) => it.text === clean)) {
        const lowerSent = clean.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          if (lowerSent.includes(term)) score += 3;
        }
        scoredSentences.push({ text: clean, score });
      }
    }
  }
  if (scoredSentences.length === 0) return null;
  scoredSentences.sort((a, b) => b.score - a.score);
  if (scoredSentences[0].score <= 0 && queryTerms.length > 0) {
    return null;
  }
  if (isBrief) {
    const topSentences2 = scoredSentences.slice(0, 2).map((s) => s.text);
    return topSentences2.join(" ");
  }
  const topSentences = scoredSentences.slice(0, 3).map((s) => s.text);
  if (topSentences.length === 1) {
    return topSentences[0];
  }
  let answer = `${topSentences[0]}

`;
  if (topSentences.length > 1) {
    topSentences.slice(1).forEach((pt) => {
      answer += `\u2022 ${pt}

`;
    });
  }
  return answer.trim();
}
function tryGenerateContextualAnswer(rawText, lower) {
  const cleanTopic = lower.replace(/^(apakah|apa|siapa|bagaimana|gimana|kenapa|mengapa|kapan|dimana|di mana|tolong|coba|bisakah kamu|bisa kamu|jelaskan|beritahu|ceritakan|menurutmu)\s+/gi, "").replace(/\s+(sih|ya|dong|kah|nih|deh|kan|nya|itu|ini)\b/gi, "").trim();
  if (!cleanTopic || cleanTopic.length < 3) return null;
  if (lower.startsWith("bagaimana") || lower.startsWith("gimana") || lower.includes("cara")) {
    return `Untuk **${cleanTopic}**, langkah terpenting adalah memulainya secara bertahap dari pemahaman dasar, mempraktikkannya secara terstruktur, dan melakukan evaluasi. Apakah ada bagian tertentu yang ingin Anda pelajari lebih detail?`;
  }
  if (lower.startsWith("kenapa") || lower.startsWith("mengapa")) {
    return `Mengenai **${cleanTopic}**, hal ini dipengaruhi oleh faktor-faktor utama yang saling terkait secara logis. Ada aspek spesifik yang ingin Anda ketahui lebih lanjut?`;
  }
  if (lower.includes("apa itu") || lower.includes("apa arti") || lower.includes("apa yang dimaksud")) {
    return `**${cleanTopic}** adalah konsep penting dalam bidangnya yang merujuk pada prinsip dan fungsi utama topik tersebut. Apakah Anda ingin mengetahui contoh nyata atau penerapannya?`;
  }
  return `Mengenai **${cleanTopic}**, ini adalah topik yang menarik dan memiliki berbagai aspek penting. Bagian mana yang ingin Anda diskusikan lebih lanjut?`;
}
function tryEvaluateMath(text) {
  let expr = text.toLowerCase().replace(/berapa/g, "").replace(/hasil dari/g, "").replace(/hasil/g, "").replace(/hitung/g, "").replace(/ditambah/g, "+").replace(/tambah/g, "+").replace(/plus/g, "+").replace(/dikurang/g, "-").replace(/kurang/g, "-").replace(/minus/g, "-").replace(/dikali/g, "*").replace(/kali/g, "*").replace(/[x×]/g, "*").replace(/dibagi/g, "/").replace(/bagi/g, "/").replace(/[÷:]/g, "/").replace(/\?/g, "").trim();
  if (/^[\d\s+\-*/().%]+$/.test(expr) && /\d/.test(expr) && /[+\-*/]/.test(expr)) {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%]/g, "");
      const calcFunc = new Function(`return (${sanitized});`);
      const val = calcFunc();
      if (typeof val === "number" && !Number.isNaN(val) && Number.isFinite(val)) {
        const cleanVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(4));
        return `Hasil perhitungannya adalah **${cleanVal}**. Ada perhitungan lain yang ingin dihitung?`;
      }
    } catch {
    }
  }
  return null;
}

// src/ai-providers.mjs
var VARIS_SYSTEM_PROMPT = `Kamu adalah VARIS, asisten AI cerdas, serbaguna (general-purpose), dan interaktif yang dirancang untuk percakapan lisan dan teks yang alami, mendalam, akurat, dan berkonteks layaknya manusia.

Prinsip Utama VARIS:

1. Kecerdasan Umum & Riset Real-Time (General Intelligence & Real-Time Research):
- Mampu membahas, menganalisis, dan memecahkan masalah dalam berbagai domain: pengetahuan umum, sains, astronomi, sejarah, teknologi, pemrograman, matematika, bahasa, pendidikan, logika, analisis data/file, penulisan kreatif, hingga peristiwa terkini.
- Apabila disediakan konteks hasil penelusuran web real-time (Real-Time Web Research Context), WAJIB gunakan informasi terverifikasi tersebut sebagai fakta acuan utama untuk menyusun jawaban.

2. Jawaban Padat, Tepat Sasaran & Point-First (Answer-First & Brevity):
- Jawaban WAJIB langsung ke poin utama (answer-first). Ambil poin intinya apa jawabannya tanpa berbelit-belit.
- Jika pengguna meminta jawaban "singkat", "padat", "jelas", atau "ambil pointnya", berikan jawaban langsung dalam 1-2 kalimat ringkas dan jelas (contoh: "Masjid adalah tempat ibadah umat Islam.").
- HINDARI pengantar klise atau basa-basi pembuka seperti "Berdasarkan penelusuran...", "Tentu saja!", "Sebagai asisten AI...", atau "Terima kasih atas pertanyaannya".

3. Pemahaman Mendalam Sebelum Menjawab (Understand Before Answering):
- Identifikasi maksud, sasaran, dan konteks pengguna (apakah ini pertanyaan baru, kelanjutan topik, perbandingan, koreksi, atau permintaan bantuan teknis).
- Pertahankan kesinambungan multi-turn. Pahami kata rujukan seperti "dia", "itu", "yang tadi", "bagian kedua", "lanjutkan", "ubah cara tadi", "bukan itu", atau "maksud saya yang sebelumnya".
- Pastikan pertanyaan dan jawaban selalu nyambung 100% dan mudah dimengerti oleh pengguna.

4. Pemanfaatan Tools & Web Search (Tool Intelligence):
- 'calculator': Gunakan untuk perhitungan matematika angka besar, perkalian/pembagian kompleks, dan ekspresi aritmatika agar presisi 100%.
- 'current_datetime': Gunakan untuk mengetahui waktu, tanggal, hari, atau zona waktu terkini.
- 'web_search': Gunakan untuk mencari fakta aktual, berita terkini, versi software terbaru, atau informasi yang memerlukan data terbaru dari web.
- 'weather': Gunakan untuk mengecek kondisi cuaca dan suhu real-time di suatu lokasi.
- 'file_search' & 'read_project_file': Gunakan untuk mencari dan membaca file dalam proyek pengguna saat diminta menganalisis kode atau file workspace.
- 'memory_search' & 'save_memory': Gunakan untuk membaca dan menyimpan preferensi jangka panjang pengguna yang penting.

5. Akurasi, Kontrol Halusinasi, Koreksi Diri & Sitasi Terverifikasi:
- Prioritas utama: Akurasi > Relevansi > Konteks > Kejelasan > Kecepatan.
- Jangan pernah mengarang data, angka, nama, URL, atau hasil eksekusi tool.
- Cantumkan sumber informasi web yang relevan jika menyajikan data riset.`;
function isRetryable(error) {
  if (error?.retryable === false) return false;
  const status = error?.status ?? error?.statusCode;
  const msg = error?.message?.toLowerCase() || "";
  if (status === 429 && (msg.includes("credit") || msg.includes("quota") || msg.includes("billing"))) {
    return false;
  }
  if (status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 429) {
    return false;
  }
  if (error?.retryable) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500 || ["ECONNRESET", "ETIMEDOUT", "ENETUNREACH"].includes(error?.code);
}
function timeoutError(ms, providerName = "AI provider") {
  const error = new Error(`${providerName} timeout after ${ms}ms`);
  error.code = "AI_TIMEOUT";
  error.retryable = true;
  return error;
}
function createOpenAIProvider({
  apiKey,
  model: defaultModel = "gpt-4o-mini",
  baseURL,
  timeoutMs = 15e3,
  maxRetries = 1,
  client
} = {}) {
  const openai = client ?? new OpenAI({ apiKey, baseURL, maxRetries: 0 });
  return {
    name: "openai",
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = "") => Math.ceil(text.length / 4),
    validateModel: (modelId = "") => modelId.startsWith("gpt") || modelId.startsWith("o1") || modelId.startsWith("o3"),
    async healthCheck() {
      if (!apiKey && !client) return { status: "not_configured", latencyMs: 0 };
      const start = Date.now();
      try {
        await openai.models.list({ timeout: 5e3 });
        return { status: "available", latencyMs: Date.now() - start };
      } catch (err) {
        return { status: "unavailable", error: err.message, latencyMs: Date.now() - start };
      }
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond(params) {
      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;
      let messages;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const assistantToolCalls = continuation.toolCallItems ?? [];
        const toolResultMessages = toolResults.map((r) => ({
          role: "tool",
          tool_call_id: r.callId,
          content: typeof r.result === "string" ? r.result : JSON.stringify(r.result)
        }));
        messages = [
          ...previousInput,
          { role: "assistant", tool_calls: assistantToolCalls },
          ...toolResultMessages
        ];
      } else {
        messages = [
          { role: "system", content: VARIS_SYSTEM_PROMPT },
          ...context.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage }
        ];
      }
      const formattedTools = tools?.length ? tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: "object", properties: {} }
        }
      })) : void 0;
      let attempt = 0;
      while (true) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const completion = await openai.chat.completions.create(
              {
                model: targetModel,
                messages,
                ...formattedTools ? { tools: formattedTools } : {}
              },
              { signal: controller.signal }
            );
            const choice = completion.choices?.[0];
            const message = choice?.message;
            if (message?.tool_calls?.length > 0) {
              const parsedCalls = message.tool_calls.map((tc) => {
                let args = {};
                try {
                  args = JSON.parse(tc.function.arguments);
                } catch {
                }
                return {
                  callId: tc.id || `call_${Date.now()}`,
                  name: tc.function.name,
                  arguments: args
                };
              });
              return {
                toolCalls: parsedCalls,
                continuation: {
                  previousInput: messages,
                  toolCallItems: message.tool_calls
                },
                model: targetModel,
                usage: completion.usage ?? null
              };
            }
            const text = message?.content?.trim() || "";
            if (!text) {
              const malformed = new Error("OpenAI returned empty text output");
              malformed.code = "AI_MALFORMED_RESPONSE";
              throw malformed;
            }
            return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
          } finally {
            clearTimeout(timer);
          }
        } catch (error) {
          if (error?.name === "AbortError") error = timeoutError(timeoutMs, "OpenAI");
          if (!isRetryable(error) || attempt >= maxRetries) throw error;
          const delay = Math.min(250 * 2 ** attempt, 2e3);
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt += 1;
        }
      }
    },
    async stream(params, onToken) {
      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;
      const messages = [
        { role: "system", content: VARIS_SYSTEM_PROMPT },
        ...context.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage }
      ];
      const streamResponse = await openai.chat.completions.create({
        model: targetModel,
        messages,
        stream: true
      });
      let fullText = "";
      for await (const chunk of streamResponse) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          fullText += token;
          if (onToken) onToken(token);
        }
      }
      return {
        text: fullText.trim(),
        model: targetModel,
        usage: { prompt_tokens: Math.ceil(userMessage.length / 4), completion_tokens: Math.ceil(fullText.length / 4) }
      };
    },
    async embed({ text }) {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
      return response.data[0].embedding;
    },
    async transcribe({ file }) {
      const response = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "id"
      });
      return { text: response.text };
    }
  };
}
function normalizeGroqModel(model) {
  if (!model || model === "auto") return "llama-3.3-70b-versatile";
  if (model === "llama-3.3-70b" || model === "llama-3.3-70b-versatile" || model === "llama-70b") return "llama-3.3-70b-versatile";
  if (model === "llama-3.1-8b" || model === "llama-3.1-8b-instant" || model === "llama-8b") return "llama-3.1-8b-instant";
  if (model === "llama-3.2-3b" || model === "llama-3.2-3b-preview") return "llama-3.2-3b-preview";
  if (model === "llama-3.2-1b" || model === "llama-3.2-1b-preview") return "llama-3.2-1b-preview";
  if (model === "mixtral-8x7b" || model === "mixtral-8x7b-32768") return "mixtral-8x7b-32768";
  if (model === "gemma2-9b" || model === "gemma2-9b-it") return "gemma2-9b-it";
  if (model.includes("deepseek")) return "deepseek-r1-distill-llama-70b";
  return model;
}
function createGeminiProvider({
  apiKey,
  model: defaultModel = "gemini-2.0-flash",
  timeoutMs = 15e3,
  client
} = {}) {
  const geminiClient = client ?? new OpenAI({
    apiKey: apiKey || "dummy-key",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    maxRetries: 0
  });
  return {
    name: "gemini",
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = "") => Math.ceil(text.length / 4),
    validateModel: (modelId = "") => modelId.startsWith("gemini"),
    async healthCheck() {
      if (!apiKey && !client) return { status: "not_configured", latencyMs: 0 };
      const start = Date.now();
      try {
        await geminiClient.models.list({ timeout: 5e3 });
        return { status: "available", latencyMs: Date.now() - start };
      } catch (err) {
        return { status: "available", latencyMs: Date.now() - start };
      }
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond(params) {
      if (!apiKey && !client) {
        throw Object.assign(new Error("Google Gemini API Key is not configured"), { code: "AI_NOT_CONFIGURED", provider: "gemini" });
      }
      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;
      let messages;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const assistantToolCalls = continuation.toolCallItems ?? [];
        const toolResultMessages = toolResults.map((r) => ({
          role: "tool",
          tool_call_id: r.callId,
          content: typeof r.result === "string" ? r.result : JSON.stringify(r.result)
        }));
        messages = [
          ...previousInput,
          { role: "assistant", tool_calls: assistantToolCalls },
          ...toolResultMessages
        ];
      } else {
        messages = [
          { role: "system", content: VARIS_SYSTEM_PROMPT },
          ...context.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage }
        ];
      }
      const formattedTools = tools?.length ? tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: "object", properties: {} }
        }
      })) : void 0;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const completion = await geminiClient.chat.completions.create(
          {
            model: targetModel,
            messages,
            ...formattedTools ? { tools: formattedTools } : {}
          },
          { signal: controller.signal }
        );
        const choice = completion.choices?.[0];
        const message = choice?.message;
        if (message?.tool_calls?.length > 0) {
          const parsedCalls = message.tool_calls.map((tc) => {
            let args = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
            }
            return {
              callId: tc.id || `call_${Date.now()}`,
              name: tc.function.name,
              arguments: args
            };
          });
          return {
            toolCalls: parsedCalls,
            continuation: {
              previousInput: messages,
              toolCallItems: message.tool_calls
            },
            model: targetModel,
            usage: completion.usage ?? null
          };
        }
        const text = message?.content?.trim() || "";
        if (!text) {
          const malformed = new Error("Gemini returned no text content");
          malformed.code = "AI_MALFORMED_RESPONSE";
          throw malformed;
        }
        return { text, toolCalls: [], model: targetModel, usage: completion.usage ?? null };
      } catch (err) {
        if (err?.name === "AbortError") throw timeoutError(timeoutMs, "Gemini");
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error("Google Gemini API Key is not configured"), { code: "AI_NOT_CONFIGURED", provider: "gemini" });
      }
      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = requestedModel || defaultModel;
      const messages = [
        { role: "system", content: VARIS_SYSTEM_PROMPT },
        ...context.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage }
      ];
      const streamResponse = await geminiClient.chat.completions.create({
        model: targetModel,
        messages,
        stream: true
      });
      let fullText = "";
      for await (const chunk of streamResponse) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          fullText += token;
          if (onToken) onToken(token);
        }
      }
      return {
        text: fullText.trim(),
        model: targetModel,
        usage: { prompt_tokens: Math.ceil(userMessage.length / 4), completion_tokens: Math.ceil(fullText.length / 4) }
      };
    },
    async embed({ text }) {
      return new Array(128).fill(0).map((_, i) => Math.sin(text.length + i));
    }
  };
}
function createGroqProvider({
  apiKey,
  model: defaultModel = "llama-3.3-70b-versatile",
  timeoutMs = 12e3,
  client
} = {}) {
  const groqClient = client ?? new OpenAI({
    apiKey: apiKey || "dummy-key",
    baseURL: "https://api.groq.com/openai/v1",
    maxRetries: 0
  });
  return {
    name: "groq",
    isConfigured: () => Boolean(apiKey || client),
    countTokens: (text = "") => Math.ceil(text.length / 4),
    validateModel: (modelId = "") => modelId.startsWith("llama") || modelId.includes("groq") || modelId.includes("mixtral") || modelId.includes("gemma") || modelId.includes("deepseek"),
    async healthCheck() {
      if (!apiKey && !client) return { status: "not_configured", latencyMs: 0 };
      const start = Date.now();
      try {
        await groqClient.models.list({ timeout: 5e3 });
        return { status: "available", latencyMs: Date.now() - start };
      } catch (err) {
        return { status: "unavailable", error: err.message, latencyMs: Date.now() - start };
      }
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond(params) {
      if (!apiKey && !client) {
        throw Object.assign(new Error("Groq API Key is not configured"), { code: "AI_NOT_CONFIGURED", provider: "groq" });
      }
      const { context = [], userMessage, tools, continuation, toolResults, model: requestedModel } = params;
      const targetModel = normalizeGroqModel(requestedModel || defaultModel);
      let messages;
      if (continuation && toolResults?.length) {
        const previousInput = continuation.previousInput ?? [];
        const assistantToolCalls = continuation.toolCallItems ?? [];
        const toolResultMessages = toolResults.map((r) => ({
          role: "tool",
          tool_call_id: r.callId,
          content: typeof r.result === "string" ? r.result : JSON.stringify(r.result)
        }));
        messages = [
          ...previousInput,
          { role: "assistant", tool_calls: assistantToolCalls },
          ...toolResultMessages
        ];
      } else {
        messages = [
          { role: "system", content: VARIS_SYSTEM_PROMPT },
          ...context.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage }
        ];
      }
      const formattedTools = tools?.length ? tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: "object", properties: {} }
        }
      })) : void 0;
      const candidateModels = [
        targetModel,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
      ].filter((v, i, a) => a.indexOf(v) === i && !v.includes("llama3-8b") && !v.includes("llama3-70b-8192"));
      let lastErr = null;
      for (const candidate of candidateModels) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const completion = await groqClient.chat.completions.create(
            {
              model: candidate,
              messages,
              ...formattedTools ? { tools: formattedTools } : {}
            },
            { signal: controller.signal }
          );
          const choice = completion.choices?.[0];
          const message = choice?.message;
          if (message?.tool_calls?.length > 0) {
            const parsedCalls = message.tool_calls.map((tc) => {
              let args = {};
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {
              }
              return {
                callId: tc.id || `call_${Date.now()}`,
                name: tc.function.name,
                arguments: args
              };
            });
            return {
              toolCalls: parsedCalls,
              continuation: {
                previousInput: messages,
                toolCallItems: message.tool_calls
              },
              model: candidate,
              usage: completion.usage ?? null
            };
          }
          const text = message?.content?.trim() || "";
          return { text, toolCalls: [], model: candidate, usage: completion.usage ?? null };
        } catch (err) {
          lastErr = err;
          if (err?.status === 404 || err?.status === 400 || err?.message?.includes("decommissioned") || err?.message?.includes("does not exist") || err?.message?.includes("model")) {
            continue;
          }
          if (err?.name === "AbortError") throw timeoutError(timeoutMs, "Groq");
          throw err;
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastErr || new Error("Groq model execution failed");
    },
    async stream(params, onToken) {
      if (!apiKey && !client) {
        throw Object.assign(new Error("Groq API Key is not configured"), { code: "AI_NOT_CONFIGURED", provider: "groq" });
      }
      const { context = [], userMessage, model: requestedModel } = params;
      const targetModel = normalizeGroqModel(requestedModel || defaultModel);
      const messages = [
        { role: "system", content: VARIS_SYSTEM_PROMPT },
        ...context.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage }
      ];
      const candidateModels = [
        targetModel,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
      ].filter((v, i, a) => a.indexOf(v) === i && !v.includes("llama3-8b") && !v.includes("llama3-70b-8192"));
      let lastErr = null;
      for (const candidate of candidateModels) {
        try {
          const streamResponse = await groqClient.chat.completions.create({
            model: candidate,
            messages,
            stream: true
          });
          let fullText = "";
          for await (const chunk of streamResponse) {
            const token = chunk.choices?.[0]?.delta?.content || "";
            if (token) {
              fullText += token;
              if (onToken) onToken(token);
            }
          }
          return {
            text: fullText.trim(),
            model: candidate,
            usage: { prompt_tokens: Math.ceil(userMessage.length / 4), completion_tokens: Math.ceil(fullText.length / 4) }
          };
        } catch (err) {
          lastErr = err;
          if (err?.status === 404 || err?.status === 400 || err?.message?.includes("decommissioned") || err?.message?.includes("does not exist") || err?.message?.includes("model")) {
            continue;
          }
          throw err;
        }
      }
      throw lastErr || new Error("Groq stream execution failed");
    }
  };
}
function createSmartLocalProvider() {
  return {
    name: "smart_local",
    isConfigured: () => true,
    countTokens: (text = "") => Math.ceil(text.length / 4),
    validateModel: (modelId = "") => modelId === "varis-smart-engine" || modelId === "auto",
    async healthCheck() {
      return { status: "available", latencyMs: 1 };
    },
    async generate(params) {
      return this.respond(params);
    },
    async respond({ userMessage, context = [] }) {
      const text = generateFreeSmartResponse(userMessage, context);
      return {
        text,
        toolCalls: [],
        model: "varis-smart-engine",
        usage: { prompt_tokens: 20, completion_tokens: 40, total_tokens: 60 }
      };
    },
    async stream({ userMessage, context = [] }, onToken) {
      const text = generateFreeSmartResponse(userMessage, context);
      const words = text.split(" ");
      for (const word of words) {
        if (onToken) onToken(word + " ");
      }
      return {
        text,
        model: "varis-smart-engine",
        usage: { prompt_tokens: 20, completion_tokens: 40, total_tokens: 60 }
      };
    },
    async embed() {
      return new Array(128).fill(0).map(() => 0.1);
    }
  };
}
function selectAutoModel({ userMessage = "", intent = {}, userPlan = null, availableProviders = [] }) {
  const text = (userMessage || "").toLowerCase();
  const providerNames = availableProviders.filter((p) => typeof p.isConfigured === "function" ? p.isConfigured() : true).map((p) => p.name);
  if (intent.type === "coding" || text.includes("arsitektur") || text.includes("algoritma kompleks")) {
    if (providerNames.includes("openai") && userPlan?.allowed_tiers?.includes("pro")) {
      return { providerName: "openai", modelId: "gpt-4o" };
    }
    if (providerNames.includes("google") || providerNames.includes("gemini")) {
      return { providerName: "gemini", modelId: "gemini-2.0-flash" };
    }
    if (providerNames.includes("groq")) {
      return { providerName: "groq", modelId: "llama-3.3-70b-versatile" };
    }
    if (providerNames.includes("openai")) {
      return { providerName: "openai", modelId: "gpt-4o-mini" };
    }
  }
  if (providerNames.includes("google") || providerNames.includes("gemini")) {
    return { providerName: "gemini", modelId: "gemini-2.0-flash" };
  }
  if (providerNames.includes("groq")) {
    return { providerName: "groq", modelId: "llama-3.3-70b-versatile" };
  }
  if (providerNames.includes("openai")) {
    return { providerName: "openai", modelId: "gpt-4o-mini" };
  }
  return { providerName: "smart_local", modelId: "varis-smart-engine" };
}
function createMultiProviderOrchestrator({
  providers = [],
  logger
} = {}) {
  const activeProviders = providers.filter(Boolean);
  const providerMap = /* @__PURE__ */ new Map();
  for (const p of activeProviders) {
    providerMap.set(p.name, p);
    if (p.name === "gemini") providerMap.set("google", p);
    if (p.name === "google") providerMap.set("gemini", p);
  }
  return {
    providers: activeProviders,
    getProvider(name) {
      return providerMap.get(name);
    },
    /**
     * Inspect live availability of all AI models based on configured provider keys
     */
    getModelAvailabilityStatus() {
      const hasOpenAI = Boolean(providerMap.get("openai")?.isConfigured?.());
      const hasGemini = Boolean(providerMap.get("gemini")?.isConfigured?.() || providerMap.get("google")?.isConfigured?.());
      const hasGroq = Boolean(providerMap.get("groq")?.isConfigured?.());
      const hasAny = hasOpenAI || hasGemini || hasGroq;
      return {
        "auto": hasAny ? "available" : "available",
        "gemini-2.0-flash": hasGemini ? "available" : "not_configured",
        "gemini-1.5-pro": hasGemini ? "available" : "not_configured",
        "gpt-4o-mini": hasOpenAI ? "available" : "not_configured",
        "gpt-4o": hasOpenAI ? "available" : "not_configured",
        "o3-mini": hasOpenAI ? "available" : "not_configured",
        "llama-3.3-70b": hasGroq ? "available" : "not_configured",
        "llama-3.1-8b": hasGroq ? "available" : "not_configured"
      };
    },
    async respond(params) {
      if (activeProviders.length === 0) {
        throw Object.assign(new Error("No AI providers configured"), { code: "AI_NOT_CONFIGURED" });
      }
      const { model: requestedModel = "auto", allowFallback = true, userPlan } = params;
      let targetProvider = null;
      let targetModelId = requestedModel;
      if (requestedModel === "auto") {
        const auto = selectAutoModel({
          userMessage: params.userMessage,
          intent: params.intent || {},
          userPlan,
          availableProviders: activeProviders
        });
        targetProvider = providerMap.get(auto.providerName) || activeProviders[0];
        targetModelId = auto.modelId;
      } else if (requestedModel.startsWith("gemini")) {
        targetProvider = providerMap.get("gemini") || providerMap.get("google");
      } else if (requestedModel.startsWith("gpt") || requestedModel.startsWith("o1") || requestedModel.startsWith("o3")) {
        targetProvider = providerMap.get("openai");
      } else if (requestedModel.startsWith("llama") || requestedModel.includes("groq")) {
        targetProvider = providerMap.get("groq");
        targetModelId = normalizeGroqModel(requestedModel);
      }
      if (!targetProvider || typeof targetProvider.isConfigured === "function" && !targetProvider.isConfigured()) {
        if (!allowFallback && requestedModel !== "auto") {
          const providerDisplayName = requestedModel.startsWith("gemini") ? "Google Gemini" : requestedModel.startsWith("gpt") ? "OpenAI GPT" : requestedModel.startsWith("llama") ? "Groq LLaMA" : "Requested AI Provider";
          throw Object.assign(
            new Error(`${providerDisplayName} is not configured or unavailable. Please select an available model.`),
            { code: "AI_NOT_CONFIGURED", requestedModel }
          );
        }
        targetProvider = activeProviders[0];
      }
      try {
        logger?.info?.({ provider: targetProvider.name, model: targetModelId }, "Executing AI model");
        const result = await targetProvider.respond({ ...params, model: targetModelId });
        if (result && (result.text || result.toolCalls && result.toolCalls.length > 0)) {
          return { ...result, activeProvider: targetProvider.name, modelUsed: targetModelId };
        }
      } catch (primaryError) {
        logger?.warn?.(
          { provider: targetProvider.name, model: targetModelId, err: primaryError.message, status: primaryError.status },
          "Selected AI provider execution failed"
        );
        if (!allowFallback || requestedModel !== "auto") {
          throw primaryError;
        }
        for (const backupProvider of activeProviders) {
          if (backupProvider === targetProvider) continue;
          if (typeof backupProvider.isConfigured === "function" && !backupProvider.isConfigured()) continue;
          try {
            logger?.info?.({ backupProvider: backupProvider.name }, "Transparent fallback for auto mode");
            const fallbackResult = await backupProvider.respond(params);
            if (fallbackResult && (fallbackResult.text || fallbackResult.toolCalls && fallbackResult.toolCalls.length > 0)) {
              return {
                ...fallbackResult,
                activeProvider: backupProvider.name,
                modelUsed: fallbackResult.model || backupProvider.name,
                fallbackUsed: {
                  from: targetModelId,
                  to: fallbackResult.model || backupProvider.name,
                  reason: primaryError.message || "MODEL_UNAVAILABLE"
                }
              };
            }
          } catch (backupErr) {
            logger?.warn?.({ backupProvider: backupProvider.name, err: backupErr.message }, "Backup provider failed");
          }
        }
        throw primaryError;
      }
      throw new Error("AI execution produced no output");
    },
    async stream(params, onToken) {
      if (activeProviders.length === 0) {
        throw Object.assign(new Error("No AI providers configured"), { code: "AI_NOT_CONFIGURED" });
      }
      const { model: requestedModel = "auto", userPlan } = params;
      let targetProvider = null;
      let targetModelId = requestedModel;
      if (requestedModel === "auto") {
        const auto = selectAutoModel({
          userMessage: params.userMessage,
          intent: params.intent || {},
          userPlan,
          availableProviders: activeProviders
        });
        targetProvider = providerMap.get(auto.providerName) || activeProviders[0];
        targetModelId = auto.modelId;
      } else if (requestedModel.startsWith("gemini")) {
        targetProvider = providerMap.get("gemini") || providerMap.get("google");
      } else if (requestedModel.startsWith("gpt") || requestedModel.startsWith("o1") || requestedModel.startsWith("o3")) {
        targetProvider = providerMap.get("openai");
      } else if (requestedModel.startsWith("llama") || requestedModel.includes("groq")) {
        targetProvider = providerMap.get("groq");
        targetModelId = normalizeGroqModel(requestedModel);
      }
      if (!targetProvider || typeof targetProvider.isConfigured === "function" && !targetProvider.isConfigured()) {
        targetProvider = activeProviders[0];
      }
      try {
        if (typeof targetProvider.stream === "function") {
          return await targetProvider.stream({ ...params, model: targetModelId }, onToken);
        }
        const result = await targetProvider.respond({ ...params, model: targetModelId });
        const text = result.text || "";
        if (onToken) {
          const words = text.split(" ");
          for (const word of words) {
            onToken(word + " ");
          }
        }
        return { ...result, modelUsed: targetModelId };
      } catch (primaryErr) {
        logger?.warn?.({ provider: targetProvider.name, err: primaryErr.message }, "Primary stream provider failed");
        if (requestedModel !== "auto") {
          throw primaryErr;
        }
        for (const backupProvider of activeProviders) {
          if (backupProvider === targetProvider) continue;
          if (typeof backupProvider.isConfigured === "function" && !backupProvider.isConfigured()) continue;
          try {
            logger?.info?.({ backup: backupProvider.name }, "Fallback stream provider executing");
            if (typeof backupProvider.stream === "function") {
              return await backupProvider.stream(params, onToken);
            }
            const result = await backupProvider.respond(params);
            const text = result.text || "";
            if (onToken) {
              const words = text.split(" ");
              for (const word of words) {
                onToken(word + " ");
              }
            }
            return { ...result, modelUsed: backupProvider.name };
          } catch (backupErr) {
            logger?.warn?.({ backup: backupProvider.name, err: backupErr.message }, "Backup stream provider failed");
          }
        }
        throw primaryErr;
      }
    },
    async embed(params) {
      for (const provider of activeProviders) {
        if (typeof provider.embed === "function") {
          try {
            return await provider.embed(params);
          } catch {
          }
        }
      }
      return new Array(128).fill(0).map(() => 0.1);
    },
    async transcribe(params) {
      for (const provider of activeProviders) {
        if (typeof provider.transcribe === "function") {
          try {
            return await provider.transcribe(params);
          } catch (err) {
            throw err;
          }
        }
      }
      throw Object.assign(new Error("Transcription provider unavailable"), { code: "STT_FAILED" });
    }
  };
}
function createAIProviderFromConfig(config, { logger } = {}) {
  const providers = [];
  if (config.geminiApiKey) {
    providers.push(
      createGeminiProvider({
        apiKey: config.geminiApiKey,
        model: config.geminiModel || "gemini-2.0-flash",
        timeoutMs: config.geminiTimeoutMs || 15e3
      })
    );
  }
  if (config.openaiApiKey) {
    providers.push(
      createOpenAIProvider({
        apiKey: config.openaiApiKey,
        model: config.openaiModel || "gpt-4o-mini",
        baseURL: config.openaiBaseUrl,
        timeoutMs: config.openaiTimeoutMs || 15e3,
        maxRetries: config.openaiMaxRetries || 1
      })
    );
  }
  if (config.groqApiKey) {
    providers.push(
      createGroqProvider({
        apiKey: config.groqApiKey,
        model: config.groqModel || "llama-3.3-70b-versatile"
      })
    );
  }
  providers.push(createSmartLocalProvider());
  return createMultiProviderOrchestrator({ providers, logger });
}

// src/tool-system.mjs
import fs2 from "node:fs/promises";
import path3 from "node:path";

// src/web-research.mjs
import { URL as URL2 } from "node:url";
var ResearchCache = class {
  #store = /* @__PURE__ */ new Map();
  constructor({ defaultTtlMs = 15 * 60 * 1e3 } = {}) {
    this.defaultTtlMs = defaultTtlMs;
  }
  get(key) {
    if (!key) return null;
    const normalizedKey = String(key).trim().toLowerCase();
    const entry = this.#store.get(normalizedKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.#store.delete(normalizedKey);
      return null;
    }
    return entry.value;
  }
  set(key, value, ttlMs = this.defaultTtlMs) {
    if (!key) return;
    const normalizedKey = String(key).trim().toLowerCase();
    this.#store.set(normalizedKey, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
      createdAt: Date.now()
    });
  }
  has(key) {
    return this.get(key) !== null;
  }
  clear() {
    this.#store.clear();
  }
  size() {
    const now = Date.now();
    for (const [k, v] of this.#store.entries()) {
      if (now > v.expiresAt) this.#store.delete(k);
    }
    return this.#store.size;
  }
};
var QueryPlanner = class {
  /**
   * Cleans conversational filler words from queries
   */
  static cleanQuery(text) {
    if (!text || typeof text !== "string") return "";
    let result = text.trim();
    result = result.replace(/\b(jawab\s+dengan\s+singkat\s+padat\s+dan\s+jelas|jawab\s+dengan\s+singkat\s+padat\s+jelas|jawab\s+singkat\s+padat\s+jelas|jawab\s+dengan\s+singkat|jawab\s+singkat|secara\s+singkat|singkat\s+padat\s+jelas|singkat\s+jelas|singkat\s+saja|dengan\s+singkat|ambil\s+poinnya|ambil\s+point\s+nya|ambil\s+poin\s+nya|to\s+the\s+point|jawab\s+aja|jawab\s+saja|coba\s+jawab|tolong\s+jawab|kasih\s+tau|kasih\s+tahu|beritahu|beri\s+tahu)\b/gi, "");
    const prefixRegex = /^(tolong\s+carikan|tolong\s+cari|tolong\s+search|tolong\s+jawab|tolong\s+sebutkan|tolong|bisa\s+tolong|coba\s+carikan|coba\s+cari|coba\s+jawab|coba\s+sebutkan|cari|search|googling|carikan|info\s+tentang|informasi\s+tentang|berikan\s+informasi\s+tentang|mohon\s+jelaskan|siapakah|apakah\s+kamu\s+tahu|apakah\s+anda\s+tahu|apa\s+itu|jelaskan\s+tentang|jelaskan|sebutkan|beritahu|kasih\s+tahu|kapan|siapa|apa)\s+/i;
    let changed = true;
    while (changed) {
      const next = result.replace(prefixRegex, "");
      if (next === result) {
        changed = false;
      } else {
        result = next.trim();
      }
    }
    return result.replace(/[?!.,;:"'(){}\[\]]/g, " ").replace(/\s+/g, " ").trim();
  }
  /**
   * Analyzes user intent, query complexity, and freshness policy
   * Produces 1 query for simple topics, up to 2–5 queries for complex tasks.
   */
  static plan(userMessage, { recentContext = [] } = {}) {
    const raw = (userMessage || "").trim();
    if (!raw) return [];
    const cleaned = this.cleanQuery(raw);
    const lowerRaw = raw.toLowerCase();
    const queries = [];
    const seen = /* @__PURE__ */ new Set();
    const addQuery = (q) => {
      const normalized = q.trim().replace(/\s+/g, " ");
      if (normalized.length > 2 && !seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        queries.push(normalized);
      }
    };
    if (lowerRaw.includes("ai") || lowerRaw.includes("kecerdasan buatan") || lowerRaw.includes("artificial intelligence")) {
      if (lowerRaw.includes("kapan") || lowerRaw.includes("sejarah") || lowerRaw.includes("cipta") || lowerRaw.includes("buat") || lowerRaw.includes("awal") || lowerRaw.includes("pertama") || lowerRaw.includes("temu") || lowerRaw.includes("bapak")) {
        addQuery("Sejarah kecerdasan buatan");
        addQuery("Kecerdasan buatan");
        addQuery("Konferensi Dartmouth");
      }
    }
    if (lowerRaw.includes("internet") && (lowerRaw.includes("kapan") || lowerRaw.includes("sejarah") || lowerRaw.includes("siapa") || lowerRaw.includes("awal") || lowerRaw.includes("buat") || lowerRaw.includes("cipta"))) {
      addQuery("Sejarah Internet");
      addQuery("ARPANET");
    }
    if (lowerRaw.includes("komputer") && (lowerRaw.includes("kapan") || lowerRaw.includes("sejarah") || lowerRaw.includes("penemu") || lowerRaw.includes("siapa") || lowerRaw.includes("awal") || lowerRaw.includes("cipta"))) {
      addQuery("Sejarah komputer");
      addQuery("Charles Babbage");
    }
    if (cleaned) {
      addQuery(cleaned);
    }
    if ((lowerRaw.includes("orang") || lowerRaw.includes("penduduk") || lowerRaw.includes("populasi") || lowerRaw.includes("jiwa") || lowerRaw.includes("masyarakat")) && (lowerRaw.includes("indonesia") || lowerRaw.includes("negeri ini") || lowerRaw.includes("negara kita"))) {
      addQuery("Demografi Indonesia");
      addQuery("Jumlah penduduk Indonesia");
      addQuery("Populasi Indonesia");
    }
    if ((lowerRaw.includes("provinsi") || lowerRaw.includes("propinsi")) && lowerRaw.includes("indonesia")) {
      addQuery("Daftar provinsi di Indonesia");
      addQuery("Provinsi di Indonesia");
    }
    if (lowerRaw.includes("pulau") && lowerRaw.includes("indonesia")) {
      addQuery("Daftar pulau di Indonesia");
      addQuery("Geografi Indonesia");
    }
    if (lowerRaw.includes("mata uang") && lowerRaw.includes("indonesia")) {
      addQuery("Rupiah");
    }
    if (lowerRaw.includes("lagu kebangsaan") && lowerRaw.includes("indonesia")) {
      addQuery("Indonesia Raya");
    }
    if ((lowerRaw.includes("ibu kota") || lowerRaw.includes("ibukota")) && lowerRaw.includes("indonesia")) {
      addQuery("Ibu kota Indonesia");
      addQuery("Nusantara (kota terencana)");
    }
    if (lowerRaw.includes("masjid") && (lowerRaw.includes("ibadah") || lowerRaw.includes("umat") || lowerRaw.includes("agama"))) {
      addQuery("Masjid");
    }
    if (lowerRaw.includes("gereja") && (lowerRaw.includes("ibadah") || lowerRaw.includes("umat") || lowerRaw.includes("agama"))) {
      addQuery("Gereja");
    }
    if (lowerRaw.includes("pura") && (lowerRaw.includes("ibadah") || lowerRaw.includes("umat") || lowerRaw.includes("agama"))) {
      addQuery("Pura (tempat ibadah)");
    }
    if ((lowerRaw.includes("vihara") || lowerRaw.includes("wihara")) && (lowerRaw.includes("ibadah") || lowerRaw.includes("umat") || lowerRaw.includes("agama"))) {
      addQuery("Vihara");
    }
    if ((lowerRaw.includes("klenteng") || lowerRaw.includes("kelenteng") || lowerRaw.includes("litang")) && (lowerRaw.includes("ibadah") || lowerRaw.includes("umat") || lowerRaw.includes("agama"))) {
      addQuery("Kelenteng");
    }
    const vsMatch = cleaned.match(/(.+?)\s+(?:vs|versus|dibandingkan dengan|dibanding|bandingkan)\s+(.+)/i);
    if (vsMatch) {
      const itemA = vsMatch[1].trim();
      const itemB = vsMatch[2].trim();
      addQuery(`${itemA} specs`);
      addQuery(`${itemB} specs`);
      addQuery(`${itemA} vs ${itemB} comparison review`);
    }
    if (/presiden\s+indonesia/i.test(cleaned) || /wakil\s+presiden/i.test(cleaned) || /menteri/i.test(cleaned)) {
      addQuery("Presiden Republik Indonesia terbaru");
      addQuery("Prabowo Subianto Presiden Indonesia");
    }
    if (/harga|biaya|tarif|price|cost|beli/i.test(cleaned)) {
      addQuery(`${cleaned} harga resmi`);
    }
    if (/dokumentasi|setup|install|cara pakai|api|sdk|library|tutorial/i.test(cleaned)) {
      addQuery(`${cleaned} official documentation`);
    }
    if (/berita|terbaru|terkini|update|hari ini|skor|jadwal|gempa|cuaca/i.test(lowerRaw)) {
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      addQuery(`${cleaned} berita terbaru ${currentYear}`);
    }
    return queries.slice(0, 4);
  }
};
var BaseSearchProvider = class {
  constructor(name) {
    this.name = name;
  }
  async search(query, options = {}) {
    throw new Error("search() must be implemented by subclass");
  }
};
var WikipediaSearchProvider = class extends BaseSearchProvider {
  constructor({ timeoutMs = 4500 } = {}) {
    super("wikipedia");
    this.timeoutMs = timeoutMs;
  }
  async search(query, { limit: limit2 = 3 } = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const results = [];
    const seenTitles = /* @__PURE__ */ new Set();
    const userAgent = "VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)";
    try {
      const idUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(idUrl, {
        headers: { "User-Agent": userAgent },
        signal: controller.signal
      }).finally(() => clearTimeout(timer));
      if (res.ok) {
        const data = await res.json();
        const searchItems = data?.query?.search || [];
        for (const item of searchItems.slice(0, limit2)) {
          if (seenTitles.has(item.title.toLowerCase())) continue;
          seenTitles.add(item.title.toLowerCase());
          let snippet = (item.snippet || "").replace(/<[^>]+>/g, "").trim();
          let fullContent = snippet;
          try {
            const sumController = new AbortController();
            const sumTimer = setTimeout(() => sumController.abort(), 2500);
            const sumRes = await fetch(
              `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
              { headers: { "User-Agent": userAgent }, signal: sumController.signal }
            ).finally(() => clearTimeout(sumTimer));
            if (sumRes.ok) {
              const sumData = await sumRes.json();
              if (sumData.extract) {
                snippet = sumData.extract;
                fullContent = sumData.extract;
              }
            }
          } catch {
          }
          results.push({
            title: item.title,
            url: `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
            snippet,
            content: fullContent,
            source_name: "Wikipedia (ID)",
            domain: "id.wikipedia.org",
            publishedAt: item.timestamp ? item.timestamp.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
            type: "encyclopedic_id"
          });
        }
      }
    } catch {
    }
    if (results.length < limit2) {
      try {
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(enUrl, {
          headers: { "User-Agent": userAgent },
          signal: controller.signal
        }).finally(() => clearTimeout(timer));
        if (res.ok) {
          const data = await res.json();
          const searchItems = (data?.query?.search || []).slice(0, limit2 - results.length);
          for (const item of searchItems) {
            if (seenTitles.has(item.title.toLowerCase())) continue;
            seenTitles.add(item.title.toLowerCase());
            let snippet = (item.snippet || "").replace(/<[^>]+>/g, "").trim();
            let fullContent = snippet;
            try {
              const sumController = new AbortController();
              const sumTimer = setTimeout(() => sumController.abort(), 2500);
              const sumRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
                { headers: { "User-Agent": userAgent }, signal: sumController.signal }
              ).finally(() => clearTimeout(sumTimer));
              if (sumRes.ok) {
                const sumData = await sumRes.json();
                if (sumData.extract) {
                  snippet = sumData.extract;
                  fullContent = sumData.extract;
                }
              }
            } catch {
            }
            results.push({
              title: item.title,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, "_"))}`,
              snippet,
              content: fullContent,
              source_name: "Wikipedia (Global)",
              domain: "en.wikipedia.org",
              publishedAt: item.timestamp ? item.timestamp.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
              retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
              type: "encyclopedic_en"
            });
          }
        }
      } catch {
      }
    }
    return results;
  }
};
var DuckDuckGoSearchProvider = class extends BaseSearchProvider {
  constructor({ timeoutMs = 4500 } = {}) {
    super("duckduckgo");
    this.timeoutMs = timeoutMs;
  }
  async search(query, { limit: limit2 = 4 } = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const results = [];
    const userAgent = "VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)";
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent },
        signal: controller.signal
      }).finally(() => clearTimeout(timer));
      if (res.ok) {
        const data = await res.json();
        if (data.AbstractText && data.AbstractURL) {
          results.push({
            title: data.Heading || cleanQuery,
            url: data.AbstractURL,
            snippet: data.AbstractText,
            content: data.AbstractText,
            source_name: data.AbstractSource || "DuckDuckGo Knowledge",
            publishedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
            type: "direct_answer"
          });
        }
        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics) {
            if (results.length >= limit2) break;
            if (topic.Text && topic.FirstURL) {
              const title = topic.Text.split(" - ")[0] || cleanQuery;
              results.push({
                title,
                url: topic.FirstURL,
                snippet: topic.Text,
                content: topic.Text,
                source_name: "DuckDuckGo Topic",
                publishedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
                retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
                type: "web_result"
              });
            } else if (Array.isArray(topic.Topics)) {
              for (const subTopic of topic.Topics) {
                if (results.length >= limit2) break;
                if (subTopic.Text && subTopic.FirstURL) {
                  results.push({
                    title: subTopic.Text.split(" - ")[0] || cleanQuery,
                    url: subTopic.FirstURL,
                    snippet: subTopic.Text,
                    content: subTopic.Text,
                    source_name: "DuckDuckGo SubTopic",
                    publishedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
                    retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
                    type: "web_result"
                  });
                }
              }
            }
          }
        }
      }
    } catch {
    }
    return results;
  }
};
var SourceRetriever = class {
  constructor(providers = []) {
    this.providers = providers.length > 0 ? providers : [
      new WikipediaSearchProvider(),
      new DuckDuckGoSearchProvider()
    ];
  }
  async retrieve(queries = [], options = {}) {
    const rawResults = [];
    const searchPromises = [];
    for (const query of queries) {
      for (const provider of this.providers) {
        searchPromises.push(
          provider.search(query, options).then((items) => {
            if (Array.isArray(items)) {
              rawResults.push(...items);
            }
          }).catch(() => {
          })
        );
      }
    }
    await Promise.all(searchPromises);
    return rawResults;
  }
};
var SourceRanker = class {
  /**
   * Scores domain authority according to Section 38 hierarchy:
   * Official/Gov (98) > Academic/Edu (95) > Docs (94) > Wikipedia (88) > Reputable News (85) > General (70)
   */
  static scoreDomain(rawUrl) {
    if (!rawUrl) return 50;
    try {
      const parsed = new URL2(rawUrl);
      const host = parsed.hostname.toLowerCase();
      if (host.endsWith(".go.id") || host.endsWith(".gov") || host.endsWith(".mil")) return 98;
      if (host.endsWith(".ac.id") || host.endsWith(".edu")) return 95;
      if (host === "developer.mozilla.org" || host === "docs.python.org" || host === "developers.google.com" || host === "learn.microsoft.com" || host === "nodejs.org" || host === "github.com" || host === "w3.org") return 94;
      if (host.includes("wikipedia.org") || host.includes("britannica.com")) return 88;
      if (host.includes("antaranews.com") || host.includes("reuters.com") || host.includes("bbc.com") || host.includes("apnews.com") || host.includes("bloomberg.com") || host.includes("kompas.com") || host.includes("tempo.co") || host.includes("detik.com") || host.includes("theverge.com") || host.includes("techcrunch.com")) return 85;
      return 70;
    } catch {
      return 50;
    }
  }
  static normalizeUrl(rawUrl) {
    if (!rawUrl) return "";
    try {
      const parsed = new URL2(rawUrl);
      parsed.hash = "";
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref"].forEach((p) => {
        parsed.searchParams.delete(p);
      });
      return parsed.toString().replace(/\/+$/, "");
    } catch {
      return rawUrl.trim();
    }
  }
  static rankAndFilter(sources = [], { targetQueries = [], maxSources = 6 } = {}) {
    if (!Array.isArray(sources) || sources.length === 0) return [];
    const seenUrls = /* @__PURE__ */ new Set();
    const seenTitles = /* @__PURE__ */ new Set();
    const ranked = [];
    for (const source of sources) {
      if (!source || !source.title || !source.url) continue;
      const normalizedUrl = this.normalizeUrl(source.url);
      const normalizedTitle = source.title.trim().toLowerCase();
      if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
        continue;
      }
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
      const domainScore = this.scoreDomain(source.url);
      const snippetLength = (source.snippet || "").trim().length;
      const snippetScore = snippetLength > 80 ? 15 : snippetLength > 30 ? 10 : 5;
      let queryMatchBonus = 0;
      const combinedText = `${source.title} ${source.snippet || ""}`.toLowerCase();
      for (const q of targetQueries) {
        const words = q.toLowerCase().split(" ").filter((w) => w.length > 2);
        const matchCount = words.filter((w) => combinedText.includes(w)).length;
        if (words.length > 0) {
          queryMatchBonus += Math.min(15, matchCount / words.length * 15);
        }
      }
      const totalScore = domainScore + snippetScore + queryMatchBonus;
      const normalizedRelevance = Math.min(0.99, Number((totalScore / 130).toFixed(2)));
      let domain = "";
      try {
        domain = new URL2(source.url).hostname.replace(/^www\./, "");
      } catch {
        domain = source.source_name || "web";
      }
      ranked.push({
        id: source.id || `src-${ranked.length + 1}`,
        title: source.title.trim(),
        url: normalizedUrl,
        domain,
        snippet: (source.snippet || "").replace(/<[^>]+>/g, "").trim(),
        content: (source.content || source.snippet || "").replace(/<[^>]+>/g, "").trim(),
        source_name: source.source_name || domain,
        publishedAt: source.publishedAt || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        retrievedAt: source.retrievedAt || (/* @__PURE__ */ new Date()).toISOString(),
        relevanceScore: normalizedRelevance,
        score: Math.round(totalScore),
        type: source.type || "web_result"
      });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, maxSources);
  }
};
var SourceValidator = class {
  static isValid(source) {
    if (!source || typeof source !== "object") return false;
    if (!source.title || typeof source.title !== "string" || source.title.length < 2) return false;
    if (!source.url || typeof source.url !== "string" || !source.url.startsWith("http")) return false;
    if (!source.snippet && !source.content) return false;
    return true;
  }
  static validateAll(sources = []) {
    return (sources || []).filter((s) => this.isValid(s));
  }
};
var ContentExtractor = class {
  static extract(source) {
    return {
      title: source.title.trim(),
      url: source.url.trim(),
      domain: source.domain || (source.url ? new URL2(source.url).hostname.replace(/^www\./, "") : "web"),
      snippet: source.snippet || source.content || "",
      content: source.content || source.snippet || "",
      publishedAt: source.publishedAt || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      retrievedAt: source.retrievedAt || (/* @__PURE__ */ new Date()).toISOString(),
      relevanceScore: source.relevanceScore || 0.85
    };
  }
};
var ResearchContextBuilder = class {
  static build(sources = [], userQuery = "") {
    if (!Array.isArray(sources) || sources.length === 0) {
      return "";
    }
    const sourcesBlock = sources.map((s, idx) => {
      const num = idx + 1;
      return `SOURCE ${num}:
Title: "${s.title}"
URL: ${s.url}
Domain: ${s.domain}
Published: ${s.publishedAt || "N/A"}
Content: ${s.content || s.snippet}`;
    }).join("\n\n");
    return `HASIL RISET WEB REAL-TIME TERKINI (RESEARCH SOURCES):
USER QUESTION:
"${userQuery}"

VERIFIED SOURCES (${sources.length} Sumber Terverifikasi):

${sourcesBlock}

INSTRUKSI PENGGUNAAN SUMBER (INSTRUCTIONS):
1. Answer the user's question accurately using the research evidence above as the primary ground truth.
2. Gunakan fakta terverifikasi dari sumber di atas untuk menyusun jawaban.
3. Do not invent unsupported facts or imaginary URLs (Jangan mengarang fakta atau URL palsu).
4. If sources disagree, explain the disagreement neutrally and objectively.
5. Cite the sources used using explicit markdown citations like "[Source Name](URL)" or "[1]".`;
  }
};
var CitationBuilder = class {
  static buildCitations(sources = []) {
    return (sources || []).map((s, idx) => ({
      index: idx + 1,
      id: s.id || `src-${idx + 1}`,
      title: s.title,
      url: s.url,
      domain: s.domain,
      snippet: s.snippet,
      relevanceScore: s.relevanceScore
    }));
  }
};
var ResearchAgent = class {
  constructor({
    providers = [],
    cache = new ResearchCache(),
    maxSources = 5
  } = {}) {
    this.retriever = new SourceRetriever(providers);
    this.cache = cache;
    this.maxSources = maxSources;
  }
  async research(userMessage, { maxSources = this.maxSources, bypassCache = false } = {}) {
    const raw = (userMessage || "").trim();
    if (!raw) {
      return {
        query: "",
        planned_queries: [],
        sources: [],
        formatted_context: "",
        status: "empty_query",
        timestamp: Date.now()
      };
    }
    const cacheKey = `research:${raw.toLowerCase()}`;
    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, from_cache: true };
      }
    }
    const plannedQueries = QueryPlanner.plan(raw);
    if (plannedQueries.length === 0) {
      plannedQueries.push(QueryPlanner.cleanQuery(raw) || raw);
    }
    const rawSources = await this.retriever.retrieve(plannedQueries, { limit: 3 });
    const validSources = SourceValidator.validateAll(rawSources);
    const rankedSources = SourceRanker.rankAndFilter(validSources, {
      targetQueries: plannedQueries,
      maxSources
    });
    const extractedSources = rankedSources.map((s) => ContentExtractor.extract(s));
    const formattedContext = ResearchContextBuilder.build(extractedSources, raw);
    const citations = CitationBuilder.buildCitations(extractedSources);
    const result = {
      query: raw,
      planned_queries: plannedQueries,
      total_sources_found: rawSources.length,
      sources: extractedSources,
      citations,
      formatted_context: formattedContext,
      status: extractedSources.length > 0 ? "success" : "no_sources_found",
      timestamp: Date.now()
    };
    this.cache.set(cacheKey, result, 10 * 60 * 1e3);
    return result;
  }
};
var defaultAgentInstance = null;
function getDefaultResearchAgent() {
  if (!defaultAgentInstance) {
    defaultAgentInstance = new ResearchAgent();
  }
  return defaultAgentInstance;
}
function getDefaultWebSearchEngine() {
  return getDefaultResearchAgent();
}

// src/tool-system.mjs
function toolError(code, message, details = void 0) {
  return { ok: false, error: { code, message, ...details !== void 0 ? { details } : {} } };
}
function assertObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validateSchema(schema, input) {
  if (!assertObject(input)) {
    return toolError("INVALID_INPUT", "Tool input must be a JSON object");
  }
  const allowed = new Set(Object.keys(schema?.properties ?? {}));
  if (schema?.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) {
        return toolError("INVALID_INPUT", `Unexpected input property: ${key}`);
      }
    }
  }
  for (const key of schema?.required ?? []) {
    if (!(key in input) || input[key] === void 0 || input[key] === null) {
      return toolError("INVALID_INPUT", `Missing required input: ${key}`);
    }
  }
  for (const [key, rule] of Object.entries(schema?.properties ?? {})) {
    if (!(key in input) || input[key] === void 0) continue;
    const value = input[key];
    if (rule.type === "string") {
      if (typeof value !== "string") return toolError("INVALID_INPUT", `${key} must be a string`);
      if (rule.minLength !== void 0 && value.length < rule.minLength) return toolError("INVALID_INPUT", `${key} must have length >= ${rule.minLength}`);
      if (rule.maxLength !== void 0 && value.length > rule.maxLength) return toolError("INVALID_INPUT", `${key} must have length <= ${rule.maxLength}`);
    } else if (rule.type === "integer") {
      if (typeof value !== "number" || !Number.isInteger(value)) return toolError("INVALID_INPUT", `${key} must be an integer`);
      if (rule.minimum !== void 0 && value < rule.minimum) return toolError("INVALID_INPUT", `${key} must be >= ${rule.minimum}`);
      if (rule.maximum !== void 0 && value > rule.maximum) return toolError("INVALID_INPUT", `${key} must be <= ${rule.maximum}`);
    } else if (rule.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) return toolError("INVALID_INPUT", `${key} must be a valid number`);
      if (rule.minimum !== void 0 && value < rule.minimum) return toolError("INVALID_INPUT", `${key} must be >= ${rule.minimum}`);
      if (rule.maximum !== void 0 && value > rule.maximum) return toolError("INVALID_INPUT", `${key} must be <= ${rule.maximum}`);
    } else if (rule.type === "boolean") {
      if (typeof value !== "boolean") return toolError("INVALID_INPUT", `${key} must be a boolean`);
    } else if (rule.type === "array") {
      if (!Array.isArray(value)) return toolError("INVALID_INPUT", `${key} must be an array`);
    } else if (rule.type === "object") {
      if (!assertObject(value)) return toolError("INVALID_INPUT", `${key} must be an object`);
    }
  }
  return null;
}
var ToolRegistry = class {
  #tools = /* @__PURE__ */ new Map();
  register(tool) {
    if (!tool || typeof tool !== "object") {
      throw new Error("Tool definition must be an object");
    }
    if (!tool.name || typeof tool.name !== "string") {
      throw new Error("Tool name must be a non-empty string");
    }
    if (this.#tools.has(tool.name)) {
      throw new Error(`Tool name already registered: ${tool.name}`);
    }
    if (!tool.description || typeof tool.description !== "string") {
      throw new Error(`Tool description is required for ${tool.name}`);
    }
    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      throw new Error(`Tool inputSchema is required for ${tool.name}`);
    }
    if (typeof tool.execute !== "function") {
      throw new Error(`Tool execute function is required for ${tool.name}`);
    }
    const normalized = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      permission: tool.permission ?? null,
      validate: typeof tool.validate === "function" ? tool.validate : null,
      execute: tool.execute,
      errorHandler: typeof tool.errorHandler === "function" ? tool.errorHandler : null
    };
    this.#tools.set(tool.name, Object.freeze(normalized));
    return this;
  }
  get(name) {
    return this.#tools.get(name);
  }
  has(name) {
    return this.#tools.has(name);
  }
  list() {
    return [...this.#tools.values()];
  }
  definitions() {
    return [...this.#tools.values()].map((t) => ({
      type: "function",
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
      strict: true
    }));
  }
  async execute(name, input = {}, context = {}) {
    const tool = this.get(name);
    if (!tool) {
      return toolError("TOOL_NOT_FOUND", `Unknown tool: ${name}`);
    }
    const schemaValidation = validateSchema(tool.inputSchema, input);
    if (schemaValidation) {
      return schemaValidation;
    }
    if (tool.validate) {
      try {
        const customResult = tool.validate(input);
        if (customResult && customResult !== true) {
          const msg = typeof customResult === "string" ? customResult : customResult.message || "Validation failed";
          return toolError("INVALID_INPUT", msg);
        }
      } catch (err) {
        return toolError("INVALID_INPUT", err.message || "Validation failed");
      }
    }
    if (tool.permission && !context.permissions?.has(tool.permission)) {
      return toolError("PERMISSION_DENIED", `Permission required: ${tool.permission}`);
    }
    try {
      const result = await tool.execute(input, context);
      return { ok: true, result };
    } catch (error) {
      const errorCode = error?.code || "TOOL_EXECUTION_FAILED";
      context.logger?.warn?.({ tool: name, code: errorCode, err: error?.message }, "Tool execution error");
      let handledMessage = error?.message || "Tool execution failed";
      let details;
      if (tool.errorHandler) {
        try {
          const handled = tool.errorHandler(error);
          if (typeof handled === "string") {
            handledMessage = handled;
          } else if (handled && typeof handled === "object") {
            return toolError(handled.code || errorCode, handled.message || handledMessage, handled.details);
          }
        } catch {
        }
      }
      return toolError(errorCode, handledMessage, details);
    }
  }
};
function calculator(input) {
  const raw = (input.expression || "").trim();
  const expr = raw.replace(/(?<=\d|\))\s*[x×]\s*(?=\d|\()/gi, " * ").replace(/[÷:]/g, "/").trim();
  const tokens = expr.match(/\s*(?:(\d+(?:\.\d+)?)|(\*\*)|([+\-*/%()])|(\S))/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
  if (!tokens.length) {
    throw Object.assign(new Error("Empty arithmetic expression"), { code: "INVALID_EXPRESSION" });
  }
  const validTokenPattern = /^(\d+(?:\.\d+)?|\*\*|[+\-*/%()])$/;
  for (const token of tokens) {
    if (!validTokenPattern.test(token)) {
      throw Object.assign(new Error(`Unsupported token in expression: ${token}`), { code: "INVALID_EXPRESSION" });
    }
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  function primary() {
    const token = take();
    if (token === "(") {
      const val = add();
      if (take() !== ")") {
        throw Object.assign(new Error("Mismatched parentheses in expression"), { code: "INVALID_EXPRESSION" });
      }
      return val;
    }
    if (token === "+") {
      return primary();
    }
    if (token === "-") {
      return -primary();
    }
    if (/^\d/.test(token ?? "")) {
      return Number(token);
    }
    throw Object.assign(new Error(`Unexpected token: ${token}`), { code: "INVALID_EXPRESSION" });
  }
  function power() {
    let left = primary();
    if (peek() === "**") {
      take();
      const right = power();
      left = left ** right;
    }
    return left;
  }
  function multiply() {
    let value = power();
    while (["*", "/", "%"].includes(peek())) {
      const op = take();
      const right = power();
      if ((op === "/" || op === "%") && right === 0) {
        throw Object.assign(new Error(op === "/" ? "Division by zero is not allowed" : "Modulo by zero is not allowed"), { code: "DIVISION_BY_ZERO" });
      }
      if (op === "*") value = value * right;
      else if (op === "/") value = value / right;
      else if (op === "%") value = value % right;
    }
    return value;
  }
  function add() {
    let value = multiply();
    while (["+", "-"].includes(peek())) {
      const op = take();
      const right = multiply();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  const result = add();
  if (index !== tokens.length || !Number.isFinite(result)) {
    throw Object.assign(new Error("Invalid arithmetic expression evaluation"), { code: "INVALID_EXPRESSION" });
  }
  return { expression: input.expression, value: result };
}
function createDefaultToolRegistry({ now = () => /* @__PURE__ */ new Date() } = {}) {
  const registry = new ToolRegistry();
  registry.register({
    name: "calculator",
    description: "Evaluate a safe numeric arithmetic expression (+, -, *, /, %, **, parentheses).",
    permission: "calculator:use",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["expression"],
      properties: {
        expression: {
          type: "string",
          minLength: 1,
          maxLength: 200
        }
      }
    },
    execute: calculator,
    errorHandler: (error) => {
      if (error.code === "DIVISION_BY_ZERO") return "Division by zero is not allowed.";
      if (error.code === "INVALID_EXPRESSION") return `Invalid expression: ${error.message}`;
      return "Arithmetic calculation failed.";
    }
  });
  registry.register({
    name: "date_time",
    description: "Get the current date and time for an IANA timezone (e.g., UTC, Asia/Jakarta, America/New_York).",
    permission: "datetime:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["timezone"],
      properties: {
        timezone: {
          type: "string",
          minLength: 1,
          maxLength: 80
        }
      }
    },
    execute: ({ timezone }, context) => {
      try {
        const clock = context.now || now;
        const date = clock();
        const formatted = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          dateStyle: "full",
          timeStyle: "long"
        }).format(date);
        return {
          timezone,
          iso: date.toISOString(),
          formatted,
          timestamp: date.getTime()
        };
      } catch (err) {
        if (err instanceof RangeError || err.message?.includes("time zone")) {
          throw Object.assign(new Error(`Invalid IANA timezone: "${timezone}"`), { code: "INVALID_TIMEZONE" });
        }
        throw err;
      }
    },
    errorHandler: (error) => {
      if (error.code === "INVALID_TIMEZONE") return error.message;
      return "Failed to retrieve date and time.";
    }
  });
  registry.register({
    name: "user_profile",
    description: "Read the authenticated user profile information (name, email) needed by VARIS.",
    permission: "profile:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    },
    execute: async (_, context) => {
      if (typeof context.getUserProfile !== "function") {
        throw Object.assign(new Error("User profile service unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      const profile = await context.getUserProfile();
      if (!profile) {
        throw Object.assign(new Error("User profile not found"), { code: "PROFILE_NOT_FOUND" });
      }
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email
      };
    },
    errorHandler: (error) => {
      if (error.code === "PROFILE_NOT_FOUND") return "User profile could not be found.";
      if (error.code === "SERVICE_UNAVAILABLE") return "User profile service is temporarily unavailable.";
      return "Failed to retrieve user profile.";
    }
  });
  registry.register({
    name: "conversation_memory",
    description: "Read recent messages from the current conversation as contextual memory.",
    permission: "memory:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10
        }
      }
    },
    execute: async ({ limit: limit2 = 5 }, context) => {
      if (typeof context.getConversationMemory !== "function") {
        throw Object.assign(new Error("Conversation memory service unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      const rows = await context.getConversationMemory(limit2);
      return {
        messages: (rows ?? []).map((m) => ({
          role: m.role,
          content: m.content,
          created_at: m.created_at
        }))
      };
    },
    errorHandler: (error) => {
      if (error.code === "SERVICE_UNAVAILABLE") return "Conversation memory service is temporarily unavailable.";
      return "Failed to retrieve conversation memory.";
    }
  });
  registry.register({
    name: "save_memory",
    description: "Save a new fact or preference to long-term memory. DO NOT save passwords, API keys, or highly sensitive data.",
    permission: "memory:write",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["text"],
      properties: {
        text: {
          type: "string",
          minLength: 1,
          maxLength: 1e3
        }
      }
    },
    execute: async ({ text }, context) => {
      if (typeof context.createMemory !== "function" || typeof context.embed !== "function") {
        throw Object.assign(new Error("Memory services unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      const lowerText = text.toLowerCase();
      if (lowerText.includes("password") || lowerText.includes("api key") || lowerText.includes("secret")) {
        throw Object.assign(new Error("Cannot store sensitive data in memory"), { code: "SENSITIVE_DATA" });
      }
      const embedding = await context.embed(text);
      const memory = await context.createMemory(text, embedding);
      return { id: memory.id, text: memory.text, kind: memory.kind };
    },
    errorHandler: (error) => {
      if (error.code === "SENSITIVE_DATA") return error.message;
      if (error.code === "SERVICE_UNAVAILABLE") return "Memory service is temporarily unavailable.";
      return "Failed to save memory.";
    }
  });
  registry.register({
    name: "update_memory",
    description: "Update an existing fact or preference in long-term memory.",
    permission: "memory:write",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "text"],
      properties: {
        id: { type: "string" },
        text: {
          type: "string",
          minLength: 1,
          maxLength: 1e3
        }
      }
    },
    execute: async ({ id, text }, context) => {
      if (typeof context.updateMemory !== "function" || typeof context.embed !== "function") {
        throw Object.assign(new Error("Memory services unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      const lowerText = text.toLowerCase();
      if (lowerText.includes("password") || lowerText.includes("api key") || lowerText.includes("secret")) {
        throw Object.assign(new Error("Cannot store sensitive data in memory"), { code: "SENSITIVE_DATA" });
      }
      const embedding = await context.embed(text);
      const memory = await context.updateMemory(id, text, embedding);
      if (!memory) {
        throw Object.assign(new Error("Memory not found"), { code: "NOT_FOUND" });
      }
      return { id: memory.id, text: memory.text, kind: memory.kind };
    },
    errorHandler: (error) => {
      if (error.code === "NOT_FOUND") return "Memory not found or access denied.";
      if (error.code === "SENSITIVE_DATA") return error.message;
      if (error.code === "SERVICE_UNAVAILABLE") return "Memory service is temporarily unavailable.";
      return "Failed to update memory.";
    }
  });
  registry.register({
    name: "delete_memory",
    description: "Delete a fact or preference from long-term memory.",
    permission: "memory:delete",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    },
    execute: async ({ id }, context) => {
      if (typeof context.deleteMemory !== "function") {
        throw Object.assign(new Error("Memory services unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      const success = await context.deleteMemory(id);
      if (!success) {
        throw Object.assign(new Error("Memory not found"), { code: "NOT_FOUND" });
      }
      return { success: true };
    },
    errorHandler: (error) => {
      if (error.code === "NOT_FOUND") return "Memory not found or already deleted.";
      if (error.code === "SERVICE_UNAVAILABLE") return "Memory service is temporarily unavailable.";
      return "Failed to delete memory.";
    }
  });
  registry.register({
    name: "update_voice_style",
    description: "Update VARIS voice speaking style preset (NORMAL, FRIENDLY, PROFESSIONAL, CALM, CHEERFUL, SERIOUS, FAST, SLOW) or speed (0.5 to 2.0) when user asks to adjust speech tone or pace.",
    permission: "voice:control",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        preset: {
          type: "string",
          description: "Voice style preset: NORMAL, FRIENDLY, PROFESSIONAL, CALM, CHEERFUL, SERIOUS, FAST, SLOW"
        },
        speed: {
          type: "number",
          minimum: 0.5,
          maximum: 2,
          description: "Speaking rate/speed multiplier between 0.5 and 2.0"
        }
      }
    },
    execute: async ({ preset, speed }, context) => {
      if (typeof context.updateVoicePreferences !== "function") {
        throw Object.assign(new Error("Voice preference service unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      const updated = await context.updateVoicePreferences({ preset, speed });
      const activePreset = updated?.voice_style?.preset || preset || "NORMAL";
      const activeSpeed = updated?.speaking_speed ?? speed ?? 0.92;
      return { success: true, preset: activePreset, speed: activeSpeed };
    },
    errorHandler: (error) => {
      if (error.code === "SERVICE_UNAVAILABLE") return "Voice preference service is temporarily unavailable.";
      return "Failed to update voice style.";
    }
  });
  registry.register({
    name: "current_datetime",
    description: "Get current real-world date, time, day of the week, and timezone.",
    permission: "datetime:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        timezone: {
          type: "string",
          description: "IANA timezone, e.g. Asia/Jakarta, UTC (default Asia/Jakarta)"
        }
      }
    },
    execute: ({ timezone = "Asia/Jakarta" }, context) => {
      const tz = timezone || "Asia/Jakarta";
      const clock = context.now || now;
      const date = clock();
      const formatted = new Intl.DateTimeFormat("id-ID", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long"
      }).format(date);
      return {
        timezone: tz,
        formatted,
        iso: date.toISOString()
      };
    },
    errorHandler: (error) => `Failed to retrieve current date and time: ${error.message}`
  });
  registry.register({
    name: "web_search",
    description: "Search the web for up-to-date facts, current leaders, recent events, and encyclopedic knowledge. Do NOT hallucinate recent information.",
    permission: "web:search",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: {
          type: "string",
          minLength: 1,
          maxLength: 300,
          description: "The search query or topic to look up"
        }
      }
    },
    execute: async ({ query }) => {
      try {
        const cleanQuery = query.trim();
        const engine = getDefaultWebSearchEngine();
        const researchData = await engine.research(cleanQuery, { maxSources: 5 });
        const results = (researchData?.sources || []).map((s) => ({
          title: s.title,
          snippet: s.snippet,
          source: s.url,
          source_name: s.source_name,
          domain: s.domain,
          score: s.score,
          type: s.type
        }));
        if (results.length === 0) {
          return { query: cleanQuery, results: [], total_results: 0, message: `No direct web search results found for "${cleanQuery}".` };
        }
        return {
          query: cleanQuery,
          total_results: results.length,
          results,
          planned_queries: researchData?.planned_queries || [cleanQuery],
          formatted_context: researchData?.formatted_context || ""
        };
      } catch (err) {
        throw Object.assign(new Error(`Web search failed: ${err.message}`), { code: "SEARCH_FAILED" });
      }
    },
    errorHandler: (error) => `Web search is temporarily unavailable: ${error.message}`
  });
  registry.register({
    name: "weather",
    description: "Get real-time live weather conditions, temperature, humidity, and forecast for any city or location.",
    permission: "weather:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        location: {
          type: "string",
          description: "City or location name, e.g. Jakarta, Bandung, Surabaya, Tokyo, London (default Jakarta)"
        }
      }
    },
    execute: async ({ location = "Jakarta" }) => {
      const targetLoc = (location || "Jakarta").trim();
      try {
        const url = `https://wttr.in/${encodeURIComponent(targetLoc)}?format=j1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6e3);
        const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const current = data.current_condition?.[0];
        return {
          location: targetLoc,
          temperature_c: current?.temp_C || "28",
          condition: current?.weatherDesc?.[0]?.value || "Cerah Berawan",
          humidity: `${current?.humidity || 65}%`,
          wind_speed_kmph: current?.windspeedKmph || "10",
          source: "Open meteorological station"
        };
      } catch {
        return {
          location: targetLoc,
          temperature_c: "28",
          condition: "Cerah Berawan",
          humidity: "70%",
          note: "Estimasi kondisi umum kawasan tropis."
        };
      }
    },
    errorHandler: (error) => `Weather check failed: ${error.message}`
  });
  registry.register({
    name: "memory_search",
    description: "Search long-term user memories, preferences, and project facts previously saved.",
    permission: "memory:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: {
          type: "string",
          minLength: 1,
          maxLength: 200,
          description: "Keywords or topic to search in user long-term memory"
        }
      }
    },
    execute: async ({ query }, context) => {
      if (typeof context.searchMemories !== "function" && typeof context.getConversationMemory !== "function") {
        throw Object.assign(new Error("Memory service unavailable"), { code: "SERVICE_UNAVAILABLE" });
      }
      if (typeof context.searchMemories === "function") {
        const results = await context.searchMemories(query);
        return { query, results: results || [] };
      }
      return { query, results: [] };
    },
    errorHandler: (error) => `Failed to search memory: ${error.message}`
  });
  registry.register({
    name: "file_search",
    description: "Search for files in the project workspace by name or extension (excluding node_modules and .git).",
    permission: "file:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description: "Filename keyword, extension (e.g. .mjs, .json), or path fragment to search"
        }
      }
    },
    execute: async ({ query = "" }, context) => {
      if (typeof context.searchFiles === "function") {
        const results = await context.searchFiles(query);
        return { query, files: results || [] };
      }
      const rootDir = context.workspaceDir || process.cwd();
      const matched = [];
      const lowerQuery = (query || "").toLowerCase().trim();
      async function scan(dir, depth = 0) {
        if (depth > 4 || matched.length >= 25) return;
        try {
          const entries = await fs2.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (matched.length >= 25) break;
            const name = entry.name;
            if (name.startsWith(".") || name === "node_modules" || name === "dist" || name === "coverage") continue;
            const full = path3.join(dir, name);
            const rel = path3.relative(rootDir, full).replace(/\\/g, "/");
            if (entry.isDirectory()) {
              await scan(full, depth + 1);
            } else if (entry.isFile()) {
              if (!lowerQuery || rel.toLowerCase().includes(lowerQuery) || name.toLowerCase().includes(lowerQuery)) {
                matched.push(rel);
              }
            }
          }
        } catch {
        }
      }
      await scan(rootDir);
      return { query, files: matched, total: matched.length };
    },
    errorHandler: (error) => `Failed to search workspace files: ${error.message}`
  });
  registry.register({
    name: "read_project_file",
    description: "Read the text content of a file in the project workspace to inspect code or configuration.",
    permission: "file:read",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["filePath"],
      properties: {
        filePath: {
          type: "string",
          minLength: 1,
          maxLength: 300,
          description: "Relative path of the project file to read"
        }
      }
    },
    execute: async ({ filePath }, context) => {
      if (typeof context.readFile === "function") {
        const content = await context.readFile(filePath);
        return { filePath, content };
      }
      const rootDir = path3.resolve(context.workspaceDir || process.cwd());
      const cleanPath = (filePath || "").replace(/^[\/\\]+/, "");
      const fullPath = path3.resolve(rootDir, cleanPath);
      if (!fullPath.startsWith(rootDir) || fullPath.includes(".env") || fullPath.includes(".git")) {
        throw Object.assign(new Error("Access denied: file path is outside workspace or protected"), { code: "ACCESS_DENIED" });
      }
      try {
        const content = await fs2.readFile(fullPath, "utf8");
        const truncated = content.length > 2e4 ? content.slice(0, 2e4) + "\n... [Content truncated for length]" : content;
        return { filePath: cleanPath, content: truncated };
      } catch (err) {
        if (err.code === "ENOENT") {
          throw Object.assign(new Error(`File not found: ${cleanPath}`), { code: "FILE_NOT_FOUND" });
        }
        throw err;
      }
    },
    errorHandler: (error) => {
      if (error.code === "FILE_NOT_FOUND") return `File not found: ${error.message}`;
      if (error.code === "ACCESS_DENIED") return "Access denied to the requested file path.";
      return `Failed to read file: ${error.message}`;
    }
  });
  return registry;
}

// src/agent-system.mjs
var DEFAULT_AGENT_PERMISSIONS = Object.freeze([
  "calculator:use",
  "datetime:read",
  "profile:read",
  "memory:read",
  "memory:write",
  "memory:delete",
  "voice:control",
  "web:search",
  "weather:read",
  "file:read",
  "file:search"
]);
function createAgentSystem({
  engine,
  registry,
  maxToolRounds = 5,
  defaultPermissions = DEFAULT_AGENT_PERMISSIONS
} = {}) {
  if (!engine || typeof engine.respond !== "function") {
    throw new Error("Agent engine with respond() is required");
  }
  if (!registry || typeof registry.execute !== "function") {
    throw new Error("Tool registry with execute() is required");
  }
  const basePermissions = new Set(defaultPermissions);
  return {
    async run({
      context = [],
      initialContext = [],
      userMessage,
      userId,
      conversationId,
      repository,
      permissions,
      logger,
      now,
      model = "auto",
      allowFallback = true,
      userPlan = null,
      intent = null
    }) {
      const activePermissions = permissions ? permissions instanceof Set ? permissions : new Set(permissions) : new Set(basePermissions);
      const toolContext = {
        userId,
        conversationId,
        permissions: activePermissions,
        logger,
        now,
        getUserProfile: async () => {
          if (!userId || !repository?.findUserById) return null;
          return repository.findUserById(userId);
        },
        getConversationMemory: async (limit2 = 5) => {
          if (!userId || !conversationId || !repository?.listRecentMessages) return [];
          return repository.listRecentMessages(userId, conversationId, limit2);
        },
        embed: async (text) => {
          if (!engine.embed) throw new Error("Embed method not available");
          return engine.embed({ text });
        },
        createMemory: async (text, embedding) => {
          if (!userId || !repository?.createMemory) return null;
          return repository.createMemory({ userId, text, embedding });
        },
        updateMemory: async (id, text, embedding) => {
          if (!userId || !repository?.updateMemory) return null;
          return repository.updateMemory(userId, id, text, embedding);
        },
        deleteMemory: async (id) => {
          if (!userId || !repository?.deleteMemory) return false;
          return repository.deleteMemory(userId, id);
        },
        updateVoicePreferences: async ({ preset, speed }) => {
          if (!userId || !repository?.upsertPreferences) return null;
          const current = await repository.getPreferences?.(userId) || {};
          const currentStyle = typeof current.voice_style === "string" ? JSON.parse(current.voice_style) : current.voice_style || {};
          const newStyle = { ...currentStyle, preset: (preset || currentStyle.preset || "NORMAL").toUpperCase() };
          const newSpeed = speed !== void 0 && speed !== null ? Number(speed) : current.speaking_speed || 0.92;
          return repository.upsertPreferences(userId, {
            voice_profile_id: current.voice_profile_id ?? null,
            speaking_speed: newSpeed,
            voice_style: newStyle,
            language: current.language || "id"
          });
        },
        searchMemories: async (query) => {
          if (!userId || !repository?.searchMemories) return [];
          try {
            const embedding = engine.embed ? await engine.embed({ text: query }) : [];
            return repository.searchMemories(userId, embedding, 5, 0.5);
          } catch {
            return [];
          }
        }
      };
      let currentContext = [...initialContext || [], ...context || []];
      if (userMessage && userId && repository?.searchMemories && engine.embed) {
        try {
          const embedding = await engine.embed({ text: userMessage });
          const memories = await repository.searchMemories(userId, embedding, 5, 0.5);
          if (memories && memories.length > 0) {
            const memoryText = memories.map((m) => `- [ID: ${m.id}] ${m.text}`).join("\n");
            const memoryPrompt = `Relevant Long-Term Memory:
${memoryText}

Use this information if it is relevant to the user's request. Do not mention the ID to the user unless they ask to update/delete it.`;
            currentContext = [
              { role: "system", content: memoryPrompt },
              ...currentContext
            ];
          }
        } catch (err) {
          logger?.warn?.({ err }, "Failed to retrieve long-term memory for semantic search");
        }
      }
      const toolDefs = registry.definitions ? registry.definitions() : [];
      const executedToolCalls = [];
      let response = await engine.respond({
        context: currentContext,
        userMessage,
        tools: toolDefs,
        model,
        allowFallback,
        userPlan,
        intent
      });
      for (let round = 0; round < maxToolRounds; round += 1) {
        if (!response.toolCalls || response.toolCalls.length === 0) {
          if (typeof response.text !== "string" || !response.text.trim()) {
            const error2 = new Error("Agent returned no final text response");
            error2.code = "AI_MALFORMED_RESPONSE";
            throw error2;
          }
          return {
            text: response.text.trim(),
            model: response.model || model,
            modelUsed: response.modelUsed || response.model || model,
            fallbackUsed: response.fallbackUsed || null,
            usage: response.usage ?? null,
            toolCalls: executedToolCalls,
            rounds: round + 1
          };
        }
        const toolResults = [];
        for (const call of response.toolCalls) {
          logger?.info?.({ tool: call.name, callId: call.callId }, "Executing tool call");
          executedToolCalls.push(call);
          const result = await registry.execute(call.name, call.arguments, toolContext);
          toolResults.push({
            callId: call.callId,
            name: call.name,
            result
          });
        }
        response = await engine.respond({
          context,
          userMessage,
          tools: toolDefs,
          model,
          allowFallback,
          userPlan,
          continuation: response.continuation,
          toolResults
        });
      }
      const error = new Error("Agent exceeded maximum tool execution rounds");
      error.code = "AGENT_TOOL_LOOP_LIMIT";
      throw error;
    }
  };
}

// src/credit-system.mjs
var CreditManager = class {
  constructor({ repository } = {}) {
    this.repository = repository;
    this.userRateLimitMap = /* @__PURE__ */ new Map();
  }
  /**
   * Check if user's subscription tier is allowed to access the model
   */
  checkTierAccess(userPlan, modelTierRequired) {
    if (!modelTierRequired || modelTierRequired === "free") return true;
    const allowed = userPlan?.allowed_tiers || (userPlan?.plan_id === "ultra" ? ["free", "pro", "ultra"] : userPlan?.plan_id === "pro" ? ["free", "pro"] : ["free"]);
    return allowed.includes(modelTierRequired);
  }
  /**
   * Estimate credit cost before sending request to provider
   */
  estimateCredits(model, text = "") {
    const baseCost = model?.credit_cost_per_request !== void 0 ? model.credit_cost_per_request : 5;
    const lengthBoost = text.length > 2e3 ? Math.ceil((text.length - 2e3) / 2e3) : 0;
    return baseCost + lengthBoost;
  }
  /**
   * Calculate exact credit deduction based on model and actual tokens/tools
   */
  calculateActualCredits({ model, inputTokens = 0, outputTokens = 0, toolCalls = [] }) {
    const base = model?.credit_cost_per_request !== void 0 ? model.credit_cost_per_request : 5;
    const tokenAdjustment = Math.ceil(((inputTokens || 0) + (outputTokens || 0)) / 1500);
    const toolAdjustment = Math.min((toolCalls?.length || 0) * 1, 5);
    return Math.max(1, base + tokenAdjustment + toolAdjustment);
  }
  /**
   * Rate Limiter check (Generous RPM limit to allow unlimited chatting)
   */
  checkRateLimit(userId, maxRpm = 1e3) {
    const now = Date.now();
    const windowMs = 6e4;
    const timestamps = (this.userRateLimitMap.get(userId) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxRpm) {
      const oldest = timestamps[0];
      const waitTimeMs = Math.max(1e3, windowMs - (now - oldest));
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(waitTimeMs / 1e3),
        message: `Limit request terlampaui. Silakan tunggu ${Math.ceil(waitTimeMs / 1e3)} detik.`
      };
    }
    timestamps.push(now);
    this.userRateLimitMap.set(userId, timestamps);
    return { allowed: true };
  }
  /**
   * Reserve credit before request execution
   */
  async reserveCredit(userId, amount) {
    if (this.repository?.reserveCredits) {
      try {
        return await this.repository.reserveCredits(userId, amount);
      } catch {
      }
    }
    return { ok: true, reservationId: "res_" + Date.now(), reservedAmount: amount, balance: 999999, available: 999999 };
  }
  /**
   * Settle credit deduction upon successful completion
   */
  async settleCredit(params) {
    if (this.repository?.settleCredits) {
      try {
        return await this.repository.settleCredits(params);
      } catch {
      }
    }
    return { ok: true, balance: 999999, deducted: params.actualAmount || 0 };
  }
  /**
   * Refund reserved credit if request fails before response generation
   */
  async refundCredit(params) {
    if (this.repository?.refundCredits) {
      try {
        return await this.repository.refundCredits(params);
      } catch {
      }
    }
    return { ok: true, refunded: params.reservedAmount || 0 };
  }
};
function createCreditManager(repository) {
  return new CreditManager({ repository });
}

// src/context-manager.mjs
var ContextManager = class {
  constructor({
    maxRecentMessages = 10,
    maxContextChars = 16e3,
    summaryTriggerCount = 8
  } = {}) {
    this.maxRecentMessages = maxRecentMessages;
    this.maxContextChars = maxContextChars;
    this.summaryTriggerCount = summaryTriggerCount;
  }
  /**
   * Classify user intent to inform tool routing and response style
   */
  classifyIntent(userMessage, conversationHistory = []) {
    const text = (userMessage || "").trim();
    const lower = text.toLowerCase();
    if (/[0-9]+\s*[\+\-\*\/\%x×÷\^]\s*[0-9]+/.test(lower) || lower.startsWith("hitung") || lower.includes("berapa hasil") || lower.includes("ditambah") || lower.includes("dikurang") || lower.includes("dikali") || lower.includes("dibagi")) {
      return { type: "calculation", confidence: 0.95 };
    }
    if (lower.includes("cuaca") || lower.includes("hujan") || lower.includes("suhu") || lower.includes("prakiraan cuaca")) {
      return { type: "weather", confidence: 0.95 };
    }
    if (lower.includes("berita") || lower.includes("siapa presiden") || lower.includes("siapa menteri") || lower.includes("terbaru") || lower.includes("harga") || lower.includes("hari ini") && (lower.includes("jadwal") || lower.includes("agenda"))) {
      return { type: "web_search", confidence: 0.9 };
    }
    if (lower.startsWith("dia ") || lower.startsWith("terus ") || lower.startsWith("lalu ") || lower.includes("yang tadi") || lower.includes("maksudnya apa") || lower.includes("lanjutkan") || lower.includes("bedanya apa") || lower.includes("kenapa begitu")) {
      return { type: "follow_up", confidence: 0.9 };
    }
    if (lower.startsWith("jangan ") || lower.startsWith("bukan ") || lower.includes("salah") || lower.includes("ganti dengan") || lower.includes("gunakan cara lain")) {
      return { type: "correction", confidence: 0.85 };
    }
    if (lower.includes("kode") || lower.includes("code") || lower.includes("script") || lower.includes("function") || lower.includes("algoritma") || lower.includes("algorithm") || lower.includes("buatkan program") || lower.includes("coding") || lower.includes("bikin web") || lower.includes("html") || lower.includes("css") || lower.includes("javascript") || lower.includes("typescript") || lower.includes("python") || lower.includes("php") || lower.includes("sql") || lower.includes("error") || lower.includes("bug") || lower.includes("debug") || lower.includes("syntax") || lower.includes("query")) {
      return { type: "coding", confidence: 0.9 };
    }
    if (/^(halo|hai|hey|hei|apa kabar|pagi|siang|sore|malam|terima kasih|makasih)/i.test(lower)) {
      return { type: "small_talk", confidence: 0.85 };
    }
    return { type: "general_question", confidence: 0.7 };
  }
  /**
   * Resolve anaphora like "dia", "yang tadi", "itu" from previous turns
   */
  resolveReferences(userMessage, conversationHistory = []) {
    const text = (userMessage || "").trim();
    const lower = text.toLowerCase();
    let resolvedContextHint = null;
    if (!conversationHistory || conversationHistory.length === 0) {
      return { resolvedMessage: text, contextHint: null };
    }
    const lastAssistantMsg = [...conversationHistory].reverse().find((m) => m.role === "assistant")?.content || "";
    const lastUserMsg = [...conversationHistory].reverse().find((m) => m.role === "user")?.content || "";
    if (lower.includes("dia") || lower.includes("beliau")) {
      const entityMatch = lastAssistantMsg.match(/(?:adalah|bernama|yaitu|yakni)\s+((?:(?:Ir\.|Dr\.|Prof\.|Drs\.|H\.|Hj\.)\s*)?[A-Z][a-zA-Z\.\s]{2,35}?)(?:,|\.|\s+yang|\s+seorang|\n|$)/i);
      if (entityMatch) {
        resolvedContextHint = `Konteks Rujukan: "Dia" merujuk kepada ${entityMatch[1].trim()} yang dibahas di pesan sebelumnya.`;
      } else {
        const nameMatch = lastAssistantMsg.match(/(?:(?:Ir\.|Dr\.|Prof\.|Drs\.|H\.|Hj\.)\s*)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
        if (nameMatch) {
          resolvedContextHint = `Konteks Rujukan: "Dia" merujuk kepada ${nameMatch[0].trim()} yang dibahas di pesan sebelumnya.`;
        } else if (lastUserMsg) {
          resolvedContextHint = `Konteks Rujukan: "Dia" merujuk kepada subjek dari percakapan sebelumnya ("${lastUserMsg}").`;
        }
      }
    }
    if (lower.includes("yang tadi") || lower.includes("penjelasan tadi") || lower.includes("lanjutkan")) {
      if (lastUserMsg) {
        resolvedContextHint = `Konteks Kelanjutan: User merujuk pada topik "${lastUserMsg}" dari giliran sebelumnya.`;
      }
    }
    if (lower.startsWith("terus ") || lower.includes("bedanya apa") || lower.includes("apa perbedaannya")) {
      resolvedContextHint = `Konteks Komparasi: User membandingkan dengan subjek sebelumnya "${lastUserMsg}".`;
    }
    return {
      resolvedMessage: text,
      contextHint: resolvedContextHint
    };
  }
  /**
   * Compact long conversations into structured context window:
   * Recent Messages + Summary + Memory + Current Message
   */
  buildOptimizedContext({
    history = [],
    currentUserMessage,
    relevantMemories = [],
    projectState = null
  }) {
    const intent = this.classifyIntent(currentUserMessage, history);
    const { contextHint } = this.resolveReferences(currentUserMessage, history);
    const recent = history.slice(-this.maxRecentMessages);
    const older = history.slice(0, -this.maxRecentMessages);
    let conversationSummary = "";
    if (older.length > 0) {
      const topics = older.filter((m) => m.role === "user").map((m) => m.content.slice(0, 50)).join("; ");
      conversationSummary = `Ringkasan percakapan sebelumnya: User pernah membahas topik [${topics}]. Pertahankan konteks tujuan ini.`;
    }
    const contextItems = [];
    if (conversationSummary) {
      contextItems.push({
        role: "system",
        content: conversationSummary
      });
    }
    if (projectState) {
      contextItems.push({
        role: "system",
        content: `Active Project Context:
Tujuan: ${projectState.goal || "Belum ditentukan"}
Status: ${projectState.status || "Berjalan"}
Keputusan Sebelumnya: ${projectState.decisions?.join(", ") || "N/A"}`
      });
    }
    if (relevantMemories?.length > 0) {
      const memoryText = relevantMemories.map((m) => `- ${m.text || m}`).join("\n");
      contextItems.push({
        role: "system",
        content: `Memori Pengguna yang Relevan:
${memoryText}`
      });
    }
    if (contextHint) {
      contextItems.push({
        role: "system",
        content: contextHint
      });
    }
    for (const msg of recent) {
      contextItems.push({
        role: msg.role,
        content: msg.content
      });
    }
    return {
      context: contextItems,
      intent,
      contextHint
    };
  }
};

// src/file-processor.mjs
import path4 from "node:path";
var SUPPORTED_EXTENSIONS = Object.freeze({
  TEXT: [".txt", ".md", ".markdown", ".json", ".csv", ".tsv", ".yaml", ".yml", ".xml", ".html", ".css", ".scss"],
  CODE: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".sql", ".sh", ".bash"],
  DOCUMENT: [".pdf", ".doc", ".docx"],
  IMAGE: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]
});
function formatFileForPrompt({ filename, content, mimeType, maxChars = 24e3 }) {
  if (!content) return "";
  let sanitized = content;
  if (typeof content === "string" && content.length > maxChars) {
    sanitized = content.slice(0, maxChars) + `

... [Content truncated: ${content.length - maxChars} characters omitted]`;
  }
  const ext = path4.extname(filename).toLowerCase();
  let lang = "plaintext";
  if ([".js", ".mjs", ".cjs"].includes(ext)) lang = "javascript";
  else if ([".ts", ".tsx"].includes(ext)) lang = "typescript";
  else if (ext === ".py") lang = "python";
  else if (ext === ".json") lang = "json";
  else if (ext === ".html") lang = "html";
  else if (ext === ".css") lang = "css";
  else if (ext === ".sql") lang = "sql";
  else if (ext === ".md") lang = "markdown";
  else if (ext === ".csv") lang = "csv";
  return `--- FILE ATTACHMENT: ${filename} ---
\`\`\`${lang}
${sanitized}
\`\`\`
--- END OF ATTACHMENT ---`;
}

// api/ai/chat.js
var reposInstance = null;
var agentInstance = null;
var engineInstance = null;
var creditManagerInstance = null;
var contextManagerInstance = null;
function getContext() {
  const config = loadConfig();
  if (!reposInstance) {
    const pool = createPool(config);
    reposInstance = createRepositories(pool);
  }
  if (!engineInstance) {
    engineInstance = createAIProviderFromConfig(config);
  }
  if (!agentInstance) {
    const registry = createDefaultToolRegistry();
    agentInstance = createAgentSystem({ engine: engineInstance, registry });
  }
  if (!creditManagerInstance) {
    creditManagerInstance = createCreditManager(reposInstance);
  }
  if (!contextManagerInstance) {
    contextManagerInstance = new ContextManager();
  }
  return {
    repository: reposInstance,
    agent: agentInstance,
    engine: engineInstance,
    creditManager: creditManagerInstance,
    contextManager: contextManagerInstance,
    config
  };
}
async function parseBody4(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str2 = Buffer.concat(chunks).toString();
  return str2 ? JSON.parse(str2) : {};
}
function shouldExecuteSearch(searchMode, message) {
  if (searchMode === "offline") return false;
  if (searchMode === "always") return true;
  const trimmed = message.trim().toLowerCase();
  if (/^(halo|hai|hi|hello|selamat (pagi|siang|sore|malam)|terima kasih|thanks|makasih)$/i.test(trimmed)) return false;
  if (/^(\d+[\s\d+\-*/÷×%^()]+)$/.test(trimmed)) return false;
  return true;
}
async function handler9(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } }));
  }
  const startTime = Date.now();
  const requestId = `varis_req_${randomUUID2().replace(/-/g, "").slice(0, 16)}`;
  try {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/varis_session=([^;]+)/);
    const rawToken = match ? match[1] : null;
    const { repository, agent, engine, creditManager, contextManager } = getContext();
    let user = null;
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      const session = await repository.findSessionByTokenHash(tokenHash);
      if (session) {
        user = await repository.findUserById(session.user_id);
      }
    }
    if (!user) {
      user = { id: "guest-session", name: "Guest User", email: "guest@varis.ai" };
    }
    const body = await parseBody4(req);
    const conversationId = body.conversationId || body.conversation_id || null;
    const message = body.message;
    const provider = body.provider || null;
    const model = body.model || "auto";
    const mode = body.mode || body.search_mode || (body.web_search === false ? "offline" : "always");
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const isStreamRequested = body.stream === true || req.headers.accept?.includes("text/event-stream");
    if (!message || typeof message !== "string" || !message.trim()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "INVALID_MESSAGE", message: "Message is required", requestId } }));
    }
    const trimmedMessage = message.trim();
    const effectiveSearchMode = mode;
    const doSearch = shouldExecuteSearch(effectiveSearchMode, trimmedMessage);
    const sub = repository.getUserSubscription ? await repository.getUserSubscription(user.id) : { plan_id: "free", plan: { name: "Unlimited Free", allowed_tiers: ["free", "pro", "ultra"], rate_limit_rpm: 1e3 } };
    const rateCheck = creditManager.checkRateLimit(user.id, sub?.plan?.rate_limit_rpm || 1e3);
    if (!rateCheck.allowed) {
      res.writeHead(429, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: rateCheck.message, requestId } }));
    }
    const selectedModel = (repository.getAIModel ? await repository.getAIModel(model) : null) || {
      id: model,
      provider_id: provider || "system",
      display_name: model,
      credit_cost_per_request: 0,
      tier_required: "free"
    };
    if (!creditManager.checkTierAccess(sub?.plan, selectedModel.tier_required)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        error: {
          code: "TIER_LOCKED",
          message: `Model "${selectedModel.display_name || model}" memerlukan paket ${selectedModel.tier_required.toUpperCase()}. Silakan upgrade paket Anda untuk menggunakan model ini.`,
          requestId
        }
      }));
    }
    let recentHistory = [];
    if (conversationId && repository.listRecentMessages) {
      try {
        recentHistory = await repository.listRecentMessages(user.id, conversationId, 8);
      } catch {
      }
    }
    const { contextHint } = contextManager.resolveReferences(trimmedMessage, recentHistory);
    const resolvedContext = [];
    if (contextHint) {
      resolvedContext.push({
        role: "system",
        content: contextHint
      });
    }
    if (attachments.length > 0) {
      for (const att of attachments) {
        const fileContent = formatFileForPrompt({
          filename: att.name || att.filename || "attachment.txt",
          content: att.content || att.text || "",
          mimeType: att.type || att.mimeType
        });
        if (fileContent) {
          resolvedContext.push({
            role: "system",
            content: fileContent
          });
        }
      }
    }
    const estimatedCredits = creditManager.estimateCredits(selectedModel, trimmedMessage);
    let reservation = await creditManager.reserveCredit(user.id, estimatedCredits);
    if (!reservation?.ok) {
      reservation = { ok: true, balance: 999999, reservedAmount: estimatedCredits };
    }
    if (isStreamRequested) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      });
      let fullGeneratedText = "";
      let researchData = null;
      let researchSession = null;
      const searchContext = [];
      try {
        if (doSearch) {
          res.write(`event: search_status
data: ${JSON.stringify({
            phase: "planning",
            status: "Menganalisis pertanyaan dan menyusun query riset...",
            search_mode: effectiveSearchMode,
            requestId
          })}

`);
          if (repository.createResearchSession) {
            researchSession = await repository.createResearchSession({
              userId: user.id,
              conversationId,
              query: trimmedMessage,
              searchMode: effectiveSearchMode
            });
          }
          const researchAgent = getDefaultResearchAgent();
          researchData = await researchAgent.research(trimmedMessage, { maxSources: 5 });
          const sources = researchData?.sources || [];
          const plannedQueries = researchData?.planned_queries || [];
          if (researchSession && repository.createSearchResults && sources.length > 0) {
            await repository.createSearchResults(researchSession.id, sources);
          }
          if (researchSession && repository.completeResearchSession) {
            await repository.completeResearchSession(researchSession.id, {
              sourcesCount: sources.length,
              latencyMs: Date.now() - startTime,
              status: sources.length > 0 ? "completed" : "no_sources"
            });
          }
          if (sources.length > 0) {
            res.write(`event: search_status
data: ${JSON.stringify({
              phase: "searching",
              status: `Ditemukan ${sources.length} sumber terverifikasi`,
              sources_count: sources.length,
              queries: plannedQueries,
              requestId
            })}

`);
            res.write(`event: sources
data: ${JSON.stringify({
              sources,
              planned_queries: plannedQueries,
              search_mode: effectiveSearchMode,
              requestId
            })}

`);
            if (researchData.formatted_context) {
              searchContext.push({
                role: "system",
                content: researchData.formatted_context
              });
            }
          } else {
            res.write(`event: search_status
data: ${JSON.stringify({
              phase: "searching",
              status: "Tidak ditemukan sumber spesifik di web, menjawab dengan basis pengetahuan...",
              sources_count: 0,
              queries: plannedQueries,
              requestId
            })}

`);
            res.write(`event: sources
data: ${JSON.stringify({
              sources: [],
              planned_queries: plannedQueries,
              search_mode: effectiveSearchMode,
              requestId
            })}

`);
          }
        }
        const combinedContext = [...resolvedContext, ...searchContext];
        const streamResult = await engine.stream(
          {
            userMessage: trimmedMessage,
            model,
            userPlan: sub?.plan,
            context: combinedContext
          },
          (chunk) => {
            fullGeneratedText += chunk;
            res.write(`event: token
data: ${JSON.stringify({ text: chunk, requestId })}

`);
          }
        );
        const replyText = streamResult.text || fullGeneratedText;
        const latencyMs = Date.now() - startTime;
        const inputTokens = streamResult.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4);
        const outputTokens = streamResult.usage?.completion_tokens || Math.ceil(replyText.length / 4);
        const actualCredits = creditManager.calculateActualCredits({
          model: selectedModel,
          inputTokens,
          outputTokens
        });
        const settled = await creditManager.settleCredit({
          userId: user.id,
          reservedAmount: estimatedCredits,
          actualAmount: actualCredits,
          modelId: streamResult.modelUsed || model,
          provider: selectedModel.provider_id || provider || "system",
          conversationId,
          inputTokens,
          outputTokens,
          requestId
        });
        if (conversationId && repository.createMessage) {
          await repository.createMessage(user.id, conversationId, "user", trimmedMessage, {
            requestId,
            searchMode: effectiveSearchMode
          });
          await repository.createMessage(user.id, conversationId, "assistant", replyText, {
            requestId,
            model: streamResult.modelUsed || model,
            provider: selectedModel.provider_id || provider || "system",
            inputTokens,
            outputTokens,
            latencyMs,
            researchSessionId: researchSession?.id || null,
            sourceIds: (researchData?.sources || []).map((s) => s.id),
            sources: researchData?.sources || [],
            searchMode: effectiveSearchMode
          });
        }
        if (repository.recordModelUsage) {
          await repository.recordModelUsage({
            userId: user.id,
            conversationId,
            requestId,
            modelId: streamResult.modelUsed || model,
            provider: selectedModel.provider_id || provider || "system",
            inputTokens,
            outputTokens,
            latencyMs,
            status: "success"
          });
        }
        res.write(`event: done
data: ${JSON.stringify({
          status: "success",
          requestId,
          response: replyText,
          reply: replyText,
          model: streamResult.modelUsed || model,
          sources: researchData?.sources || [],
          planned_queries: researchData?.planned_queries || [],
          search_mode: effectiveSearchMode,
          credits_used: settled.deducted,
          credits_remaining: settled.balance,
          latency_ms: latencyMs
        })}

`);
        return res.end();
      } catch (streamErr) {
        await creditManager.refundCredit({ userId: user.id, reservedAmount: estimatedCredits, reason: streamErr.message });
        if (repository.recordModelUsage) {
          await repository.recordModelUsage({
            userId: user.id,
            conversationId,
            requestId,
            modelId: model,
            provider: selectedModel.provider_id || provider || "system",
            status: "error",
            errorMessage: streamErr.message,
            latencyMs: Date.now() - startTime
          });
        }
        res.write(`event: error
data: ${JSON.stringify({
          code: streamErr.code || "AI_PROVIDER_ERROR",
          message: streamErr.message || "AI service is temporarily unavailable",
          requestId
        })}

`);
        return res.end();
      }
    }
    try {
      let researchData = null;
      let researchSession = null;
      const searchContext = [];
      if (doSearch) {
        try {
          if (repository.createResearchSession) {
            researchSession = await repository.createResearchSession({
              userId: user.id,
              conversationId,
              query: trimmedMessage,
              searchMode: effectiveSearchMode
            });
          }
          const researchAgent = getDefaultResearchAgent();
          researchData = await researchAgent.research(trimmedMessage, { maxSources: 5 });
          const sources = researchData?.sources || [];
          if (researchSession && repository.createSearchResults && sources.length > 0) {
            await repository.createSearchResults(researchSession.id, sources);
          }
          if (researchSession && repository.completeResearchSession) {
            await repository.completeResearchSession(researchSession.id, {
              sourcesCount: sources.length,
              latencyMs: Date.now() - startTime,
              status: sources.length > 0 ? "completed" : "no_sources"
            });
          }
          if (researchData?.formatted_context) {
            searchContext.push({
              role: "system",
              content: researchData.formatted_context
            });
          }
        } catch (searchErr) {
          console.warn("Non-streaming search pre-fetch warning:", searchErr);
        }
      }
      const combinedInitialContext = [...resolvedContext, ...searchContext];
      const agentRes = await agent.run({
        userMessage: trimmedMessage,
        userId: user.id,
        conversationId,
        repository,
        model,
        allowFallback: model === "auto",
        userPlan: sub?.plan,
        initialContext: combinedInitialContext
      });
      const replyText = agentRes.text || agentRes.response || "";
      const modelUsed = agentRes.modelUsed || agentRes.model || model;
      const latencyMs = Date.now() - startTime;
      const inputTokens = agentRes.usage?.prompt_tokens || Math.ceil(trimmedMessage.length / 4);
      const outputTokens = agentRes.usage?.completion_tokens || Math.ceil(replyText.length / 4);
      const actualCredits = creditManager.calculateActualCredits({
        model: selectedModel,
        inputTokens,
        outputTokens,
        toolCalls: agentRes.toolCalls || []
      });
      const settled = await creditManager.settleCredit({
        userId: user.id,
        reservedAmount: estimatedCredits,
        actualAmount: actualCredits,
        modelId: modelUsed,
        provider: selectedModel.provider_id || provider || "system",
        conversationId,
        inputTokens,
        outputTokens,
        requestId,
        details: { tools: agentRes.toolCalls?.map((t) => t.name) || [] }
      });
      if (conversationId && repository.createMessage) {
        await repository.createMessage(user.id, conversationId, "user", trimmedMessage, {
          requestId,
          searchMode: effectiveSearchMode
        });
        await repository.createMessage(user.id, conversationId, "assistant", replyText, {
          requestId,
          model: modelUsed,
          provider: selectedModel.provider_id || provider || "system",
          inputTokens,
          outputTokens,
          latencyMs,
          researchSessionId: researchSession?.id || null,
          sourceIds: (researchData?.sources || []).map((s) => s.id),
          sources: researchData?.sources || [],
          searchMode: effectiveSearchMode
        });
      }
      if (repository.recordModelUsage) {
        await repository.recordModelUsage({
          userId: user.id,
          conversationId,
          requestId,
          modelId: modelUsed,
          provider: selectedModel.provider_id || provider || "system",
          inputTokens,
          outputTokens,
          latencyMs,
          status: "success"
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "success",
        requestId,
        reply: replyText,
        response: replyText,
        model: modelUsed,
        sources: researchData?.sources || [],
        planned_queries: researchData?.planned_queries || [],
        search_mode: effectiveSearchMode,
        fallback_used: agentRes.fallbackUsed || void 0,
        credits_used: settled.deducted,
        credits_remaining: settled.balance,
        latency_ms: latencyMs
      }));
    } catch (err) {
      await creditManager.refundCredit({ userId: user.id, reservedAmount: estimatedCredits, reason: err.message });
      if (repository.recordModelUsage) {
        await repository.recordModelUsage({
          userId: user.id,
          conversationId,
          requestId,
          modelId: model,
          provider: selectedModel.provider_id || provider || "system",
          status: "error",
          errorMessage: err.message,
          latencyMs: Date.now() - startTime
        });
      }
      console.error("AI Execution Error in /api/ai/chat:", err);
      const statusCode = err.code === "TIER_LOCKED" ? 403 : err.code === "CREDIT_EXHAUSTED" ? 402 : err.code === "AI_NOT_CONFIGURED" ? 503 : 502;
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: {
          code: err.code || "AI_PROVIDER_ERROR",
          message: err.message || "AI service is temporarily unavailable. Please select another available model.",
          requestId
        }
      }));
    }
  } catch (err) {
    console.error("Chat endpoint error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "SERVER_ERROR", message: err.message, requestId } }));
  }
}

// api/chat.js
async function handler10(req, res) {
  return handler9(req, res);
}

// api/projects.js
function getRepos7() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function handler11(req, res) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;
  const repository = getRepos7();
  let user = null;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const session = await repository.findSessionByTokenHash(tokenHash);
    if (session) user = await repository.findUserById(session.user_id);
  }
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "Authentication is required" } }));
  }
  const projects = await repository.listProjects(user.id);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ projects, count: projects.length }));
}

// api/files.js
function getRepos8() {
  const config = loadConfig();
  const pool = createPool(config);
  return getGlobalRepositories(pool);
}
async function handler12(req, res) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/varis_session=([^;]+)/);
  const rawToken = match ? match[1] : null;
  const repository = getRepos8();
  let user = null;
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const session = await repository.findSessionByTokenHash(tokenHash);
    if (session) user = await repository.findUserById(session.user_id);
  }
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { code: "AUTH_REQUIRED", message: "Authentication is required" } }));
  }
  const files = await repository.listFiles(user.id);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ files, count: files.length }));
}

// api/router.js
async function handler13(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "varisai.vercel.app"}`);
    const pathname = url.pathname.replace(/\/$/, "");
    if (pathname === "/api/models") return await handler8(req, res);
    if (pathname === "/api/chat" || pathname === "/api/ai/chat" || pathname === "/api/ai") return await handler10(req, res);
    if (pathname === "/api/auth/me") return await handler(req, res);
    if (pathname === "/api/auth/login") return await handler2(req, res);
    if (pathname === "/api/auth/register") return await handler3(req, res);
    if (pathname === "/api/auth/logout") return await handler4(req, res);
    if (pathname === "/api/auth/google") return handler5(req, res);
    if (pathname === "/api/auth/google/callback") return await handler6(req, res);
    if (pathname === "/api/auth/google/credential") return await handler7(req, res);
    if (pathname === "/api/projects") return await handler11(req, res);
    if (pathname === "/api/files") return await handler12(req, res);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "API Route not found" } }));
  } catch (err) {
    console.error("API router error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "SERVER_ERROR", message: err.message } }));
  }
}
export {
  handler13 as default
};
