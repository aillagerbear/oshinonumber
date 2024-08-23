importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet');

let model = null;

self.addEventListener('message', async (event) => {
  if (event.data.type === 'load') {
    try {
      await tf.ready();
      self.postMessage({ type: 'tfVersion', version: tf.version.tfjs });
      
      self.postMessage({ type: 'progress', progress: 10 });
      
      model = await mobilenet.load({
        version: 2,
        alpha: 1.0,
      }, (progress) => {
        self.postMessage({ type: 'progress', progress: 10 + progress * 80 });
      });
      
      self.postMessage({ type: 'loaded' });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  } else if (event.data.type === 'classify') {
    if (!model) {
      self.postMessage({ type: 'error', error: 'Model not loaded' });
      return;
    }
    try {
      const { imageData, width, height } = event.data;
      const pixels = new Uint8Array(imageData);
      
      // TensorFlow.js expects the image data in a specific format
      const imageTensor = tf.tensor3d(pixels, [height, width, 4]).slice([0, 0, 0], [-1, -1, 3]);
      
      const results = await model.classify(imageTensor);
      self.postMessage({ type: 'results', results });
      imageTensor.dispose();
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
});

console.log('Worker script loaded and running');