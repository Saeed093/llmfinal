/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    // https://nextjs.org/docs/architecture/nextjs-compiler#styled-components
    styledComponents: true,
  },
};


module.exports = {
  env: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  },
};

module.exports = nextConfig;
