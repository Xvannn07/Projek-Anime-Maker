const axios = require("axios");

function toanime(buffer) {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axios({
				method: "POST",
				url: "https://khrisna-helper-esm.hf.space/api/toanime",
				data: {
					images: buffer.toString("base64")
				}
			});

			resolve(response.data.data);
		} catch(e) {
			console.error(e.message);
			reject("terjadi kesalahan saat mengirim gambar: " + e.message);
		}
	});
};

module.exports = { toanime };
