const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');

class Aiease {
    constructor({ debug = false } = {}) {
        this.DEBUG = debug;
        this.AUTH_TOKEN = null;

        this.api = {
            uploader: 'https://www.aiease.ai/api/api/id_photo/s',
            genImg2Img: 'https://www.aiease.ai/api/api/gen/img2img',
            gentext2img: 'https://www.aiease.ai/api/api/gen/text2img',
            taskInfo: 'https://www.aiease.ai/api/api/id_photo/task-info',
            styleList: 'https://www.aiease.ai/api/api/common/',
            token: 'https://www.aiease.ai/api/api/user/visit',
        };

        this.headers = {
            json: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0',
                'Authorization': null,
                'Accept': 'application/json'
            },
            image: {
                'Content-Type': 'image/jpeg',
                'Host': 'pub-static.aiease.ai',
                'Origin': 'https://www.aiease.ai',
                'Referer': 'https://www.aiease.ai/',
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*'
            }
        };

        this.default_payload = {
            enhance: {
                gen_type: "enhance",
                enhance_extra_data: {
                    img_url: null,
                    mode: null, // general || anime || old_photo
                    size: "4",
                    restore: 1
                }
            },
            filter: {
                gen_type: 'ai_filter',
                ai_filter_extra_data: { 
                    img_url: null,
                    style_id: null
                }
            },
            watermark: {
                gen_type: "text_remove",
                text_remove_extra_data: {
                    img_url: null,
                    mask_url: ""
                }
            },
            rembg: {
                gen_type: "rembg",
                rembg_extra_data: {
                    img_url: null
                }
            },
            retouch: {
                gen_type: "ai_skin_repair",
                ai_skin_repair_extra_data: {
                    img_url: null
                }
            }
        };

        this.constants = {
            maxRetry: 40,
            retryDelay: 3000,
        };

        const { useEncrypt, useDecrypt } = this._setupEncryption();
        this.useEncrypt = useEncrypt;
        this.useDecrypt = useDecrypt;
    }

    _setupEncryption() {
        // Susun key phrase dari karakter-karakter
        const encryptionKeyPhrase = [
            "Q", "@", "D", "2", "4", "=", "o", "u", "e", "V", "%", "]", 
            "O", "B", "S", "8", "i", ",", "%", "e", "K", "=", "5", "I", 
            "|", "7", "W", "U", "$", "P", "e", "E"
        ].join("");
        // Buat key enkripsi dengan SHA-256 (32 byte)
        const encryptionKey = crypto.createHash('sha256').update(encryptionKeyPhrase).digest();

        return {
            useEncrypt: function (plainText) {
                const encodedText = encodeURIComponent(plainText);
                // Buat IV 16 byte secara acak
                const iv = crypto.randomBytes(16);
                // Gunakan algoritma AES-256-CFB
                const cipher = crypto.createCipheriv('aes-256-cfb', encryptionKey, iv);
                const encrypted = Buffer.concat([
                    cipher.update(encodedText, 'utf8'),
                    cipher.final()
                ]);
                // Gabungkan IV dan ciphertext
                const combined = Buffer.concat([iv, encrypted]);
                return combined.toString('base64');
            },
            useDecrypt: function (base64EncryptedText) {
                const encryptedBytes = Buffer.from(base64EncryptedText, 'base64');
                // Ambil IV dari 16 byte pertama
                const iv = encryptedBytes.slice(0, 16);
                const ciphertext = encryptedBytes.slice(16);
                const decipher = crypto.createDecipheriv('aes-256-cfb', encryptionKey, iv);
                const decrypted = Buffer.concat([
                    decipher.update(ciphertext),
                    decipher.final()
                ]);
                return decodeURIComponent(decrypted.toString('utf8'));
            }
        };
    }

    async uploadImage(input) {
        if (!this.AUTH_TOKEN) await this.getToken();
        try {
            const fileBuffer = Buffer.isBuffer(input)
                ? input
                : /^data:.*?\/.*?;base64,/i.test(input)
                    ? Buffer.from(input.split(`,`)[1], 'base64')
                    : /^https?:\/\//.test(input)
                        ? Buffer.from(new Uint8Array((await (await fetch(input)).arrayBuffer())))
                        : fs.existsSync(input)
                            ? fs.readFileSync(input)
                            : typeof input === 'string'
                                ? input
                                : Buffer.alloc(0);

            const metadata = {
                length: fileBuffer.length,
                filetype: 'image/jpeg',
                filename: 'image.jpg'
            };
            const metadataJsonString = JSON.stringify(metadata);
            const encryptedMetadata = this.useEncrypt(metadataJsonString);
            const tValue = encryptedMetadata;

            const apiUrl = `${this.api.uploader}?time=${Date.now()}`;
            const payload = { t: tValue };

            const response = await axios.post(apiUrl, payload, { headers: this.headers.json });
            const uploadUrl = this.useDecrypt(response.data.result);
            const imageSizeInBytes = fileBuffer.length;

            await axios.put(uploadUrl, fileBuffer, { headers: { 'Content-Length': imageSizeInBytes, ...this.headers.image } });
            console.log('Upload success!', `Image uploaded to ${uploadUrl.split('?')[0]}`);

            return uploadUrl.split('?')[0];
        } catch (error) {
            console.error('Image Upload Error:', error.message);
            throw error;
        }
    }

    async generateImage(type, input, { style = 4, mode = 'general' } = {}, progressCallback = null) {
        if (!this.AUTH_TOKEN) await this.getToken();
        try {
            const payload = this.default_payload[type];
            if (!payload) {
                throw new Error(`Invalid type: ${type}\nSupported types: ${Object.keys(this.default_payload).join(', ')}`);
            }
            
            const imgUrl = await this.uploadImage(input);
            const dataKey = Object.keys(payload).find(key => key.endsWith("_extra_data"));
    
            if (dataKey) {
                payload[dataKey].img_url = imgUrl;
            }
    
            if (type === 'filter') {
                payload[dataKey].style_id = style;
            } else if (type === 'enhance') {
                payload[dataKey].mode = mode;
            }
    
            const response = await axios.post(this.api.genImg2Img, payload, {
                headers: this.headers.json
            });
    
            if (response.data && response.data.result && response.data.result.task_id) {
                const taskId = response.data.result.task_id;
                if (progressCallback) progressCallback(`Task ID received: ${taskId}\n`);
                return await this.checkTaskStatus(taskId, progressCallback);
            } else {
                throw new Error(response.data.message || 'Task ID not found in response');
            }
        } catch (error) {
            if (progressCallback) progressCallback(`Image Generation Error: ${error.message}\n`);
            console.error('Image Generation Error:', error.message);
            throw error;
        }
    }

    async text2img(prompt, { style = 1, size = '1-1' } = {}) {
        if (!this.AUTH_TOKEN) await this.getToken();
        try {
            if (!prompt) throw new Error('Please provide a prompt.');
            const payload = {
                gen_type: "art_v1",
                art_v1_extra_data: {
                    prompt: prompt,
                    style_id: style,
                    size: size
                }
            };
            const response = await axios.post(this.api.gentext2img, payload, {
                headers: this.headers.json
            });

            if (response.data && response.data.result && response.data.result.task_id) {
                const taskId = response.data.result.task_id;
                console.log(`Task ID received: ${taskId}`);
                return await this.checkTaskStatus(taskId);
            } else {
                throw new Error(response.data.message || 'Task ID not found in response');
            }
        } catch (error) {
            console.error('Image Generation Error:', error.message);
            throw error;
        }
    }

    async checkTaskStatus(taskId, progressCallback = null, maxRetry = this.constants.maxRetry) {
        let status = '';
        let attempts = 0;
    
        while (status !== 'success' && attempts < maxRetry) {
            try {
                const response = await axios.get(`${this.api.taskInfo}?task_id=${taskId}`, {
                    headers: this.headers.json
                });
    
                if (response.data.code === 450) {
                    throw new Error(response.data.message);
                }
                if (response.data && response.data.result && response.data.result.data) {
                    status = response.data.result.data.queue_info.status;
                    if (progressCallback) progressCallback(`Task ${taskId} status: ${status}\n`);
                    console.log(`Task ${taskId} status: ${status}`);
                    if (status === 'success') {
                        console.log(`Task ${taskId} succeeded!`);
                        return response.data.result.data.results;
                    }
                }
            } catch (error) {
                console.error('Task Status Check Error:', error.message);
                if (progressCallback) progressCallback(`Task Status Check Error: ${error.message}\n`);
                if (error.message.includes('Image generation failed')) {
                    throw new Error(error.message);
                }
            }
            attempts++;
            if (attempts >= maxRetry) {
                const errMsg = `Max retry limit reached (${maxRetry}) for task ${taskId}`;
                console.error('Task Status Check Error:', errMsg);
                if (progressCallback) progressCallback(`${errMsg}\n`);
                throw new Error(errMsg);
            }
            await new Promise(resolve => setTimeout(resolve, this.constants.retryDelay));
        }
    }

    async getStyle(type) {
        if (!this.AUTH_TOKEN) await this.getToken();
        try {
            const end = {
                art: 'ai_art_style',
                filter: 'ai_filter_style'
            }[type];

            if (!end) {
                throw new Error(`Invalid type: ${type}\nSupported types: art, filter`);
            }

            const response = await axios.get(this.api.styleList + end, {
                headers: this.headers.json
            });

            if (response.data.code === 200) {
                console.log('Style list fetched successfully.');
                return response.data.result;
            } else {
                console.error('Failed to fetch style list:', response.data.message || 'Unknown error');
                throw new Error(response.data.message || 'Failed to fetch style list');
            }
        } catch (error) {
            console.error('Error fetching style list:', error.message);
            throw error;
        }
    }

    async getToken() {
        try {
            const response = await axios.post(this.api.token, {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (response.data.code === 200) {
                console.log('Token fetched successfully.');
                const jwt = `JWT ${response.data.result.user.token}`;
                this.AUTH_TOKEN = jwt;
                this.headers.json.Authorization = this.AUTH_TOKEN;
                return;
            } else {
                console.error('Failed to fetch token:', response.data.message || 'Unknown error');
                throw new Error(response.data.message || 'Failed to fetch token');
            }
        } catch (error) {
            console.error('Error fetching token:', error.message);
            throw error;
        }
    }
}

module.exports = Aiease;
