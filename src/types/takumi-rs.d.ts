declare module '@takumi-rs/image-response' {
  import { ReactNode } from 'react';

  interface ImageResponseOptions extends ResponseInit {
    width?: number;
    height?: number;
    format?: 'png' | 'webp' | 'jpeg';
    fonts?: Array<{
      name: string;
      data: ArrayBuffer;
      weight?: number;
      style?: 'normal' | 'italic';
    }>;
  }

  class ImageResponse extends Response {
    constructor(component: ReactNode, options?: ImageResponseOptions);
  }

  export { ImageResponse };
  export default ImageResponse;
}
