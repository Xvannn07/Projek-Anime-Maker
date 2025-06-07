const sharp = require("sharp");
const axios = require("axios");

function convertWebpToPng(input) {
    return new Promise(async(resolve, reject) => {
      try {
        if (typeof input === "string") {
          const response = await axios.get(input, { responseType: "arraybuffer"});
          const images = await response.data;
          const converting = await sharp(images);
          const converted = await converting.toFormat('png').png({ quality: 90 }).toBuffer();
          resolve(converted);
        } else if (typeof input === "object") {
          const converting = await sharp(input);
          const converted = await converting.toFormat('png').png({ quality: 90 }).toBuffer();
          resolve(converted);
        }
      } catch (e) {
        reject(e.message);
      }
    });
  }

  module.exports = { convertWebpToPng };