const AWS = require('aws-sdk');

class CloudflareR2StorageService {
    constructor() {
        try {
            this.s3 = new AWS.S3({
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                signatureVersion: 'v4',
                s3ForcePathStyle: true
            });
            console.log('✅ Cloudflare R2 conectado');
        } catch (error) {
            console.error('❌ Erro ao conectar R2:', error);
            throw error;
        }
    }

    async uploadBackup(data, fileName) {
        try {
            const fileContent = JSON.stringify(data, null, 2);
            
            console.log('📤 Upload para Cloudflare R2...');
            
            const params = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `estoque/${fileName}`,
                Body: fileContent,
                ContentType: 'application/json'
            };

            await this.s3.upload(params).promise();

            const publicUrl = `${process.env.R2_PUBLIC_URL}/${params.Key}`;

            console.log('✅ Upload concluído!');
            
            return {
                downloadUrl: publicUrl,
                fileName: fileName,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            throw error;
        }
    }
}

module.exports = new CloudflareR2StorageService();