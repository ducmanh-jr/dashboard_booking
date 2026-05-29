import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
  getPresignedUrl(folder: string): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
    const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      apiSecret,
    );

    return { signature, timestamp, cloudName, apiKey, folder };
  }
}