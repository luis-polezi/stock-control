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

    // Listar backups
    async listBackups() {
        try {
            const params = {
                Bucket: process.env.R2_BUCKET_NAME,
                Prefix: 'estoque/'
            };

            const result = await this.s3.listObjectsV2(params).promise();
            
            return result.Contents
                .filter(file => file.Key.includes('backup'))
                .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
                .map(file => ({
                    name: file.Key.replace('estoque/', ''),
                    size: file.Size,
                    created_at: file.LastModified,
                    metadata: file
                }));
                
        } catch (error) {
            console.error('❌ Erro ao listar backups:', error);
            return [];
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

    // FUNÇÃO NOVA QUE ADICIONEI - Para excluir backups
    async deleteBackup(fileName) {
        try {
            const params = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: `estoque/${fileName}`
            };
            
            await this.s3.deleteObject(params).promise();
            console.log(`✅ Backup ${fileName} excluído`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao excluir backup:', error);
            throw error;
        }
    }

    // FUNÇÃO NOVA QUE ADICIONEI - Listar backups com mais detalhes
    async listBackupsDetailed() {
        try {
            const backups = await this.listBackups();
            
            // Adicionar informações extras
            return backups.map(backup => ({
                ...backup,
                displayName: backup.name.replace('backup_estoque_', '').replace('.json', ''),
                readableDate: new Date(backup.created_at).toLocaleString('pt-BR')
            }));
        } catch (error) {
            console.error('Erro ao listar backups detalhados:', error);
            return [];
        }
    }
}

module.exports = new CloudflareR2StorageService();