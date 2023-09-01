const { BlobServiceClient } = require("@azure/storage-blob");
const { v4: uuidv4 } = require("uuid");
class FileSystem {
  async client() {
    const containerName =
      process.env.AZURE_STORAGE_CONTAINER_NAME ?? "resource365";
    const blobClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobClient.getContainerClient(containerName);
    try {
      const createContainerResponse = await containerClient.create();
      return blobClient.getContainerClient(containerName);
    } catch (e) {
      if (e.code == "ContainerAlreadyExists") {
        return blobClient.getContainerClient(containerName);
        return;
      }
    }
  }

  async download(fileName) {
    const client = await this.client();
    const blobClient = client.getBlobClient(fileName);
    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded = await streamToBuffer(
      downloadBlockBlobResponse.readableStreamBody
    );
    return {
      contentType: downloadBlockBlobResponse.originalResponse.contentType,
      buffer: downloaded,
    };

    async function streamToBuffer(readableStream) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
          chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
      });
    }
  }
  async upload(fileName, file) {
    const client = await this.client();
    const blobClient = client.getBlockBlobClient(fileName);
    const uploadResponse = await blobClient.uploadStream(
      file.stream,
      64 * 1024,
      undefined,
      { blobHTTPHeaders: { blobContentType: file.mimetype } }
    );
    return uploadResponse;
  }

  _handleFile(req, file, cb) {
    const fileName = this.getFileName(file);
    const uploadResponse = this.upload(fileName, file);
    req.body.attachment = fileName;
    cb(null, { url: file.originalname });
  }
  getFileName = (file) => {
    return uuidv4() + "_" + file.originalname;
  };
}

module.exports = function (opts) {
  return new FileSystem(opts);
};
