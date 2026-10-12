import ImageKit from '@imagekit/nodejs';

// The ImageKit SDK throws during construction when its keys are missing.
// Instantiate it lazily so a missing/misconfigured key only fails the media
// request that needs it instead of crashing the whole server on boot.
let imagekitClient = null;

const getImageKit = () => {
     if (imagekitClient) {
          return imagekitClient;
     }

     const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
     const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
     const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

     if (!publicKey || !privateKey || !urlEndpoint) {
          throw new Error(
               'ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.'
          );
     }

     imagekitClient = new ImageKit({
          publicKey,
          privateKey,
          urlEndpoint
     });

     return imagekitClient;
};

export default getImageKit;