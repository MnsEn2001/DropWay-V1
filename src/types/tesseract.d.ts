declare module "tesseract.js" {
  const Tesseract: {
    recognize: (
      image: string | Blob | HTMLCanvasElement,
      lang?: string,
    ) => Promise<unknown>;
  };
  export default Tesseract;
}
