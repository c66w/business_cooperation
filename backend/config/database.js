// 数据库配置
module.exports = {
  // 数据库服务器配置
  baseURL: process.env.DB_BASE_URL || 'https://data-server-test.ywwl.com',
  
  // 连接ID
  connectionId: process.env.DB_CONNECTION_ID || '66552525-f0aa-462e-abea-e25cd56ae8df',
  
  // 请求超时时间（毫秒）
  timeout: parseInt(process.env.DB_TIMEOUT) || 30000,
  
  // API端点
  endpoints: {
    sqlQuery: '/nl2query/sql_query'
  }
};
