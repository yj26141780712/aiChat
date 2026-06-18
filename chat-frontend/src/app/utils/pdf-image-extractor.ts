/** 动态加载 pdf.js（绕过 esbuild 模块解析问题） */
function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.mjs';
    script.type = 'module';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.mjs';
        resolve(lib);
      } else {
        reject(new Error('pdf.js 加载失败'));
      }
    };
    script.onerror = () => reject(new Error('pdf.js 脚本加载失败'));
    document.head.appendChild(script);
  });
}

/** 从 PDF 中提取的图片 */
export interface ExtractedImage {
  /** 图片文件名 */
  filename: string;
  /** 图片 Blob */
  blob: Blob;
}

/**
 * PDF 图片提取工具
 */
export class PdfImageExtractor {
  /**
   * 从 PDF 文件中提取所有图片
   * @param file PDF File 对象
   * @returns 提取的图片列表
   */
  async extractImages(file: File): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    
    try {
      const pdfjsLib = await loadPdfJs();
      
      // 读取 PDF 文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // 加载 PDF 文档
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      console.log(`PDF 共 ${numPages} 页，开始提取图片...`);

      // 逐页提取图片
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const operatorList = await page.getOperatorList();
        
        // 查找图片操作符
        const imageOps = this.findImageOperators(operatorList);
        
        if (imageOps.length > 0) {
          console.log(`第 ${pageNum} 页找到 ${imageOps.length} 张图片`);
          
          for (let i = 0; i < imageOps.length; i++) {
            try {
              const imgData = await this.extractImageData(page, imageOps[i]);
              if (imgData) {
                const filename = `${file.name.replace('.pdf', '')}_page${pageNum}_img${i + 1}.png`;
                images.push({ filename, blob: imgData });
              }
            } catch (err) {
              console.warn(`提取第 ${pageNum} 页第 ${i + 1} 张图片失败:`, err);
            }
          }
        }
      }

      console.log(`成功提取 ${images.length} 张图片`);
      return images;
    } catch (error: any) {
      console.error('PDF 图片提取失败:', error);
      throw new Error(`PDF 图片提取失败: ${error.message}`);
    }
  }

  /**
   * 查找图片操作符索引
   */
  private findImageOperators(operatorList: any): number[] {
    const indices: number[] = [];
    const ops = operatorList.fn;
    
    // 常见的图片操作符
    const imageOpCodes = [
      (window as any).pdfjsLib.OPS.paintImageXObject,
      (window as any).pdfjsLib.OPS.paintInlineImageXObject,
    ];

    for (let i = 0; i < ops.length; i++) {
      if (imageOpCodes.includes(ops[i])) {
        indices.push(i);
      }
    }

    return indices;
  }

  /**
   * 从页面提取图片数据
   */
  private async extractImageData(page: any, opIndex: number): Promise<Blob | null> {
    try {
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) return null;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 渲染页面到 canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // 将 canvas 转为 Blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (err) {
      console.warn('Canvas 渲染失败:', err);
      return null;
    }
  }
}
