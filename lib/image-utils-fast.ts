/**
 * Super Fast Image Upload Utilities
 * Optimized for maximum speed while maintaining all functionality
 */

// WebWorker for background image compression
const createCompressionWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { imageData, maxWidth, maxHeight, quality, fileType } = e.data;
      
      const canvas = new OffscreenCanvas(maxWidth, maxHeight);
      const ctx = canvas.getContext('2d');
      
      createImageBitmap(imageData).then(bitmap => {
        // Calculate optimal dimensions
        let { width, height } = bitmap;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(bitmap, 0, 0, width, height);
        
        // Convert to blob with optimal settings
        canvas.convertToBlob({ 
          type: fileType, 
          quality: fileType === 'image/jpeg' ? quality : undefined 
        }).then(blob => {
          self.postMessage({ success: true, blob, originalSize: imageData.size });
        }).catch(error => {
          self.postMessage({ success: false, error: error.message });
        });
      });
    };
  `;
  
  return new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' })));
};

// Fast compression using WebWorker
export const compressImageFast = async (
  file: File, 
  maxWidth: number = 1200, 
  maxHeight: number = 1200, 
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    // For small images, use direct compression
    if (file.size < 500000) { // 500KB threshold
      return compressImageDirect(file, maxWidth, maxHeight, quality).then(resolve).catch(reject);
    }

    // Use WebWorker for large images
    const worker = createCompressionWorker();
    
    worker.onmessage = (e) => {
      const { success, blob, error, originalSize } = e.data;
      worker.terminate();
      
      if (success) {
        const compressedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });
        console.log(`🚀 WebWorker compression: ${originalSize} -> ${compressedFile.size} bytes (${Math.round((1 - compressedFile.size / originalSize) * 100)}% reduction)`);
        resolve(compressedFile);
      } else {
        console.warn('WebWorker compression failed, falling back:', error);
        compressImageDirect(file, maxWidth, maxHeight, quality).then(resolve).catch(reject);
      }
    };
    
    worker.onerror = () => {
      worker.terminate();
      console.warn('WebWorker failed, using direct compression');
      compressImageDirect(file, maxWidth, maxHeight, quality).then(resolve).catch(reject);
    };
    
    // Send file data to worker
    worker.postMessage({ 
      imageData: file, 
      maxWidth, 
      maxHeight, 
      quality, 
      fileType: file.type 
    });
  });
};

// Direct compression for small files or fallback
const compressImageDirect = async (
  file: File, 
  maxWidth: number, 
  maxHeight: number, 
  quality: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Optimize canvas rendering
      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';
      ctx!.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            console.log(`⚡ Direct compression: ${file.size} -> ${compressedFile.size} bytes`);
            resolve(compressedFile);
          } else {
            reject(new Error('Canvas compression failed'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
};

// Lightning-fast preview using createObjectURL
export const createInstantPreview = (file: File): string => {
  return URL.createObjectURL(file);
};

// Enhanced validation with better performance
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Quick type check
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' };
  }
  
  // Size check (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }
  
  // Supported formats check
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Supported formats: JPEG, PNG, GIF, WebP' };
  }
  
  return { valid: true };
};

// Optimized filename generation
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}_${randomString}.${extension}`;
};

// WebP conversion for better compression (when supported)
export const convertToWebP = async (file: File, quality: number = 0.85): Promise<File> => {
  // Check WebP support
  const canvas = document.createElement('canvas');
  const webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  if (!webpSupport || file.type === 'image/webp') {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx!.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now()
            });
            console.log(`🎯 WebP conversion: ${file.size} -> ${webpFile.size} bytes`);
            resolve(webpFile);
          } else {
            // Keep original if WebP isn't smaller
            resolve(file);
          }
        },
        'image/webp',
        quality
      );
    };
    
    img.onerror = () => resolve(file); // Fallback to original
    img.src = URL.createObjectURL(file);
  });
};

// Enhanced upload queue with parallel processing
class FastUploadQueue {
  private activeUploads = new Set<string>();
  private readonly maxConcurrent = 3;
  
  async add<T>(id: string, uploadFunction: () => Promise<T>): Promise<T> {
    // Wait if queue is full
    while (this.activeUploads.size >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.activeUploads.add(id);
    
    try {
      const result = await uploadFunction();
      return result;
    } finally {
      this.activeUploads.delete(id);
    }
  }
  
  getActiveCount(): number {
    return this.activeUploads.size;
  }
}

export const fastUploadQueue = new FastUploadQueue();

// Progressive upload with retry mechanism
export const uploadWithRetry = async <T>(
  uploadFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
  
  throw new Error('Upload failed after all retries');
};

// Chunked upload for large files (future enhancement)
export const uploadInChunks = async (
  file: File,
  uploadFn: (chunk: Blob, index: number, total: number) => Promise<string>,
  chunkSize: number = 1024 * 1024 // 1MB chunks
): Promise<string[]> => {
  const chunks: string[] = [];
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const chunkResult = await uploadFn(chunk, i, totalChunks);
    chunks.push(chunkResult);
  }
  
  return chunks;
};

// Memory cleanup utility
export const cleanupImageResources = (urls: string[]) => {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
};

// Performance monitoring
export const measureUploadPerformance = <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now();
  
  return operation().then(result => {
    const endTime = performance.now();
    console.log(`📊 ${operationName}: ${Math.round(endTime - startTime)}ms`);
    return result;
  });
};