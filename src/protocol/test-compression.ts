import { encodeMessage, decodeMessage, createMessage, MType } from './message';

// 测试GZIP压缩功能
export function testCompression() {
  console.log('Testing GZIP compression...');
  
  // 创建测试消息
  const testPayload = {
    id: 1,
    type: 1,
    content: 'Hello, this is a test message for GZIP compression!'.repeat(10) // 重复字符串以增加压缩效果
  };
  
  const message = createMessage(MType.Cmd, testPayload);
  
  // 测试未压缩的情况
  const metaNoCompression: { version: number; serialization: number; compression: number } = {
    version: 1,
    serialization: 1,
    compression: 0
  };
  
  const encodedNoCompression = encodeMessage(message, metaNoCompression);
  const decodedNoCompression = decodeMessage(encodedNoCompression, metaNoCompression);
  
  console.log('No compression - Original size:', JSON.stringify(message).length);
  console.log('No compression - Encoded size:', encodedNoCompression.byteLength);
  console.log('No compression - Decoded successfully:', decodedNoCompression !== null);
  
  // 测试压缩的情况
  const metaCompression: { version: number; serialization: number; compression: number } = {
    version: 1,
    serialization: 1,
    compression: 1
  };
  
  const encodedCompression = encodeMessage(message, metaCompression);
  const decodedCompression = decodeMessage(encodedCompression, metaCompression);
  
  console.log('With compression - Original size:', JSON.stringify(message).length);
  console.log('With compression - Encoded size:', encodedCompression.byteLength);
  console.log('With compression - Compression ratio:', (encodedCompression.byteLength / JSON.stringify(message).length * 100).toFixed(2) + '%');
  console.log('With compression - Decoded successfully:', decodedCompression !== null);
  
  // 验证解码后的数据是否正确
  if (decodedCompression && decodedNoCompression) {
    const originalPayload = JSON.stringify(testPayload);
    const decodedPayloadNoCompression = decodedNoCompression.payload;
    const decodedPayloadCompression = decodedCompression.payload;
    
    console.log('Data integrity check - No compression:', originalPayload === decodedPayloadNoCompression);
    console.log('Data integrity check - With compression:', originalPayload === decodedPayloadCompression);
  }
  
  console.log('GZIP compression test completed!');
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  // 浏览器环境
  (window as any).testCompression = testCompression;
} else {
  // Node.js环境
  testCompression();
}
